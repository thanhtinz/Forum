'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveBan, banMessage } from '@/lib/ban';
import {
  isPrivacy, ALBUM_NAME_MAX, ALBUM_DESC_MAX, CAPTION_MAX,
  ALBUM_LIMIT, PHOTO_PER_ALBUM_LIMIT,
} from '@/lib/album-const';

export interface AlbumState {
  ok?: boolean;
  error?: string;
  /** Id album vừa tạo — để nơi gọi mở thẳng vào album đó. */
  id?: string;
}

/** Chỉ nhận ảnh do chính trang này tải lên hoặc ảnh http(s) — chặn javascript:/data:. */
function safePhotoUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  if (u.startsWith('/uploads/')) return u;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

async function refresh(userId: string, albumId?: string) {
  const me = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (!me?.username) return;
  revalidatePath(`/u/${me.username}`);
  revalidatePath(`/u/${me.username}/album`);
  if (albumId) revalidatePath(`/u/${me.username}/album/${albumId}`);
}

/** Tạo album mới, hoặc sửa album sẵn có nếu truyền `id`. */
export async function saveAlbum(_prev: AlbumState, formData: FormData): Promise<AlbumState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  // Ai đang bị khoá mồm ở diễn đàn thì cũng không mượn album để đăng ảnh.
  const banned = await getActiveBan(userId, 'POST');
  if (banned) return { error: banMessage(banned, 'tạo album') };

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 1) return { error: 'Đặt tên cho album đã.' };
  if (name.length > ALBUM_NAME_MAX) return { error: `Tên album tối đa ${ALBUM_NAME_MAX} ký tự.` };

  const description = String(formData.get('description') ?? '').trim();
  if (description.length > ALBUM_DESC_MAX) return { error: `Mô tả tối đa ${ALBUM_DESC_MAX} ký tự.` };

  const privacyRaw = String(formData.get('privacy') ?? 'PUBLIC');
  if (!isPrivacy(privacyRaw)) return { error: 'Mức riêng tư không hợp lệ.' };

  const id = String(formData.get('id') ?? '').trim();

  if (id) {
    // updateMany kèm ownerId: người khác truyền id lạ vào cũng không sửa được gì.
    const r = await db.photoAlbum.updateMany({
      where: { id, ownerId: userId },
      data: { name, description: description || null, privacy: privacyRaw },
    });
    if (r.count === 0) return { error: 'Không tìm thấy album này.' };
    await refresh(userId, id);
    return { ok: true, id };
  }

  const count = await db.photoAlbum.count({ where: { ownerId: userId } });
  if (count >= ALBUM_LIMIT) return { error: `Bạn đã có ${ALBUM_LIMIT} album, dọn bớt trước nhé.` };

  const created = await db.photoAlbum.create({
    data: { ownerId: userId, name, description: description || null, privacy: privacyRaw },
    select: { id: true },
  });

  await refresh(userId, created.id);
  return { ok: true, id: created.id };
}

/** Xoá album cùng toàn bộ ảnh trong đó. */
export async function deleteAlbum(id: string): Promise<AlbumState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const r = await db.photoAlbum.deleteMany({ where: { id, ownerId: userId } });
  if (r.count === 0) return { error: 'Không tìm thấy album này.' };

  await refresh(userId);
  return { ok: true };
}

/**
 * Thêm một ảnh đã tải lên vào album.
 *
 * Bộ đếm ảnh và ảnh bìa cập nhật trong cùng transaction với việc thêm ảnh:
 * tách ra thì chỉ cần một lần lỗi là con số hiện trên bìa album lệch mãi.
 */
export async function addPhoto(_prev: AlbumState, formData: FormData): Promise<AlbumState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const banned = await getActiveBan(userId, 'POST');
  if (banned) return { error: banMessage(banned, 'đăng ảnh') };

  const albumId = String(formData.get('albumId') ?? '');
  const album = await db.photoAlbum.findFirst({
    where: { id: albumId, ownerId: userId },
    select: { id: true, cover: true, photoCount: true },
  });
  if (!album) return { error: 'Không tìm thấy album này.' };
  if (album.photoCount >= PHOTO_PER_ALBUM_LIMIT) {
    return { error: `Mỗi album tối đa ${PHOTO_PER_ALBUM_LIMIT} ảnh.` };
  }

  const url = safePhotoUrl(String(formData.get('url') ?? ''));
  if (!url) return { error: 'Chưa chọn ảnh, hoặc đường dẫn ảnh không dùng được.' };

  const caption = String(formData.get('caption') ?? '').trim().slice(0, CAPTION_MAX);

  await db.$transaction(async (tx) => {
    await tx.photo.create({
      data: { albumId: album.id, ownerId: userId, url, caption: caption || null, order: album.photoCount },
      select: { id: true },
    });
    await tx.photoAlbum.update({
      where: { id: album.id },
      data: {
        photoCount: { increment: 1 },
        // Ảnh đầu tiên tự thành bìa, để album không bao giờ trống trơn.
        ...(album.cover ? {} : { cover: url }),
      },
      select: { id: true },
    });
  });

  await refresh(userId, album.id);
  return { ok: true };
}

/** Xoá một ảnh. */
export async function deletePhoto(id: string): Promise<AlbumState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const photo = await db.photo.findFirst({
    where: { id, ownerId: userId },
    select: { id: true, url: true, albumId: true },
  });
  if (!photo) return { error: 'Không tìm thấy ảnh này.' };

  await db.$transaction(async (tx) => {
    await tx.photo.delete({ where: { id: photo.id } });
    await tx.photoAlbum.update({
      where: { id: photo.albumId },
      data: { photoCount: { decrement: 1 } },
      select: { id: true },
    });

    // Xoá đúng tấm đang làm bìa thì phải chọn tấm khác, không thì bìa trỏ vào
    // một ảnh không còn tồn tại.
    const album = await tx.photoAlbum.findUnique({
      where: { id: photo.albumId }, select: { cover: true },
    });
    if (album?.cover === photo.url) {
      const next = await tx.photo.findFirst({
        where: { albumId: photo.albumId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { url: true },
      });
      await tx.photoAlbum.update({
        where: { id: photo.albumId }, data: { cover: next?.url ?? null }, select: { id: true },
      });
    }
  });

  await refresh(userId, photo.albumId);
  return { ok: true };
}

/** Đặt một ảnh làm bìa album. */
export async function setAlbumCover(photoId: string): Promise<AlbumState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const photo = await db.photo.findFirst({
    where: { id: photoId, ownerId: userId },
    select: { url: true, albumId: true },
  });
  if (!photo) return { error: 'Không tìm thấy ảnh này.' };

  await db.photoAlbum.update({
    where: { id: photo.albumId }, data: { cover: photo.url }, select: { id: true },
  });

  await refresh(userId, photo.albumId);
  return { ok: true };
}
