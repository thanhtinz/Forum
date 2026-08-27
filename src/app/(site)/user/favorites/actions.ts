'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_FOLDER, FOLDER_LIMIT, normalizeFolder, folderError } from '@/lib/favorite-folder';

export interface FolderState {
  ok?: boolean;
  error?: string;
}

/**
 * Chuyển một mục đã lưu sang thư mục khác.
 *
 * Tên thư mục chưa có thì coi như tạo mới — không có bảng thư mục riêng, danh
 * sách thư mục chỉ là các giá trị đang xuất hiện trong cột `folder`.
 */
export async function moveFavorite(favoriteId: string, rawFolder: string): Promise<FolderState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const bad = folderError(rawFolder);
  if (bad) return { error: bad };
  const folder = normalizeFolder(rawFolder);
  if (!folder) return { error: 'Tên thư mục không dùng được.' };

  // Chỉ đụng được vào mục của chính mình — updateMany kèm userId nên không
  // cần đọc trước, và người khác truyền id lạ vào cũng không sửa được gì.
  if (folder !== DEFAULT_FOLDER) {
    const existing = await db.favorite.findMany({
      where: { userId },
      select: { folder: true },
      distinct: ['folder'],
      // Chỉ cần biết đã chạm trần thư mục hay chưa, nên lấy vừa đủ để so.
      take: FOLDER_LIMIT + 1,
    });
    const names = new Set(existing.map((e) => e.folder));
    if (!names.has(folder) && names.size >= FOLDER_LIMIT) {
      return { error: `Bạn đã có ${FOLDER_LIMIT} thư mục, hãy dọn bớt trước.` };
    }
  }

  const r = await db.favorite.updateMany({ where: { id: favoriteId, userId }, data: { folder } });
  if (r.count === 0) return { error: 'Không tìm thấy mục đã lưu này.' };

  revalidatePath('/user/favorites');
  return { ok: true };
}

/** Đổi tên một thư mục: gom mọi mục đang ở tên cũ sang tên mới. */
export async function renameFavoriteFolder(from: string, rawTo: string): Promise<FolderState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };
  if (from === DEFAULT_FOLDER) return { error: 'Không đổi tên được thư mục mặc định.' };

  const bad = folderError(rawTo);
  if (bad) return { error: bad };
  const to = normalizeFolder(rawTo);
  if (!to) return { error: 'Tên thư mục không dùng được.' };
  if (to === from) return { ok: true };

  await db.favorite.updateMany({ where: { userId, folder: from }, data: { folder: to } });
  revalidatePath('/user/favorites');
  return { ok: true };
}

/**
 * Bỏ một thư mục: đưa mọi mục trong đó về "Chưa phân loại".
 * Không xoá mục nào — bỏ thư mục là dọn cách sắp xếp, không phải bỏ nội dung.
 */
export async function deleteFavoriteFolder(folder: string): Promise<FolderState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };
  if (folder === DEFAULT_FOLDER) return { error: 'Không bỏ được thư mục mặc định.' };

  await db.favorite.updateMany({ where: { userId, folder }, data: { folder: DEFAULT_FOLDER } });
  revalidatePath('/user/favorites');
  return { ok: true };
}
