'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { notify } from '@/lib/notify';
import { bbcodeToHtml } from '@/lib/bbcode';
import { getActiveBan, banMessage } from '@/lib/ban';
import {
  clubSlug, getClubConfig,
  CLUBS_OWNED_MAX, CLUB_NAME_MIN, CLUB_NAME_MAX, CLUB_DESC_MAX,
  CLUB_POST_MIN, CLUB_POST_MAX,
  type ClubActionState,
} from '@/lib/club';

/** Người đang đăng nhập, kèm chặn tài khoản đang bị treo. */
async function actor(): Promise<{ id: string; role: string } | { error: string }> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return { error: 'Bạn cần đăng nhập.' };
  // Cấm đăng bài thì cũng không lập nhóm/đăng bảng tin được — cùng một loại
  // hành vi, chặn một chỗ cho khỏi lệch.
  const ban = await getActiveBan(id, 'POST');
  if (ban) return { error: banMessage(ban, 'đăng bài') };
  return { id, role: (session!.user as { role?: string }).role ?? 'USER' };
}

/** Ban điều hành gỡ được nhóm hỏng mà không phải nhờ chủ nhóm. */
function isStaff(role: string): boolean {
  return role === 'ADMIN' || role === 'MODERATOR';
}

function readMode(fd: FormData, key: string, allowed: string[], fallback: string): string {
  const v = String(fd.get(key) ?? '');
  return allowed.includes(v) ? v : fallback;
}

// ─────────────────────────── Lập câu lạc bộ ───────────────────────────

export async function createClub(_prev: ClubActionState, formData: FormData): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const avatar = String(formData.get('avatar') ?? '').trim();
  const joinMode = readMode(formData, 'joinMode', ['OPEN', 'APPROVAL', 'CLOSED'], 'OPEN');
  const privacy = readMode(formData, 'privacy', ['PUBLIC', 'MEMBERS'], 'PUBLIC');

  if (name.length < CLUB_NAME_MIN) return { error: `Tên câu lạc bộ tối thiểu ${CLUB_NAME_MIN} ký tự.` };
  if (name.length > CLUB_NAME_MAX) return { error: `Tên câu lạc bộ tối đa ${CLUB_NAME_MAX} ký tự.` };
  if (description.length > CLUB_DESC_MAX) return { error: `Giới thiệu tối đa ${CLUB_DESC_MAX} ký tự.` };

  const owned = await db.club.count({ where: { ownerId: me.id } });
  if (owned >= CLUBS_OWNED_MAX) {
    return { error: `Mỗi người chỉ lập được tối đa ${CLUBS_OWNED_MAX} câu lạc bộ.` };
  }

  const { createCost } = await getClubConfig();
  const slug = clubSlug(name);

  try {
    await db.$transaction(async (tx) => {
      if (createCost > 0) {
        await grantPoints(
          { userId: me.id, amount: -createCost, reason: 'PURCHASE_CONTENT', note: `Lập câu lạc bộ: ${name}` },
          tx,
        );
      }
      const club = await tx.club.create({
        data: {
          slug, name, description: description || null, avatar: avatar || null,
          ownerId: me.id, joinMode: joinMode as never, privacy: privacy as never,
        },
        select: { id: true },
      });
      // Người lập là thành viên đầu tiên, và `memberCount` mặc định là 1 nên
      // không cộng thêm ở đây — cộng nữa là đếm chính mình hai lần.
      await tx.clubMember.create({
        data: { clubId: club.id, userId: me.id, role: 'OWNER', status: 'ACTIVE' },
        select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: `Bạn không đủ ${createCost} điểm để lập câu lạc bộ.` };
    }
    return { error: 'Không lập được câu lạc bộ, vui lòng thử lại.' };
  }

  revalidatePath('/clb');
  redirect(`/clb/${slug}`);
}

// ─────────────────────────── Vào / rời nhóm ───────────────────────────

export async function joinClub(clubId: string): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { id: true, slug: true, name: true, ownerId: true, joinMode: true },
  });
  if (!club) return { error: 'Không tìm thấy câu lạc bộ.' };
  if (club.joinMode === 'CLOSED') return { error: 'Câu lạc bộ này đang không nhận thêm thành viên.' };

  const existing = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: me.id } }, select: { status: true },
  });
  if (existing) return { ok: true };

  const status = club.joinMode === 'OPEN' ? 'ACTIVE' : 'PENDING';
  try {
    await db.$transaction(async (tx) => {
      await tx.clubMember.create({
        data: { clubId, userId: me.id, status: status as never }, select: { id: true },
      });
      // Chỉ cộng khi vào thẳng; người chờ duyệt chưa phải thành viên.
      if (status === 'ACTIVE') {
        await tx.club.update({ where: { id: clubId }, data: { memberCount: { increment: 1 } }, select: { id: true } });
      }
      await notify(
        {
          userId: club.ownerId, type: 'CLUB', actorId: me.id,
          title: status === 'ACTIVE' ? 'Có thành viên mới' : 'Có người xin vào câu lạc bộ',
          content: club.name, link: `/clb/${club.slug}`,
        },
        tx,
      );
    });
  } catch {
    // Bấm hai lần cùng lúc: ràng buộc duy nhất chặn hàng thứ hai, coi như xong.
    const now = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: me.id } }, select: { id: true },
    });
    if (!now) return { error: 'Không vào được, vui lòng thử lại.' };
  }

  revalidatePath(`/clb/${club.slug}`);
  return { ok: true };
}

export async function leaveClub(clubId: string): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const club = await db.club.findUnique({ where: { id: clubId }, select: { slug: true, ownerId: true } });
  if (!club) return { error: 'Không tìm thấy câu lạc bộ.' };
  // Chủ mà rời thì nhóm mất người quản lý — muốn dẹp thì giải tán hẳn.
  if (club.ownerId === me.id) return { error: 'Chủ câu lạc bộ không rời được; hãy giải tán câu lạc bộ.' };

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: me.id } }, select: { id: true, status: true },
  });
  if (!m) return { ok: true };

  await db.$transaction(async (tx) => {
    await tx.clubMember.delete({ where: { id: m.id }, select: { id: true } });
    if (m.status === 'ACTIVE') {
      await tx.club.update({ where: { id: clubId }, data: { memberCount: { decrement: 1 } }, select: { id: true } });
    }
  });

  revalidatePath(`/clb/${club.slug}`);
  return { ok: true };
}

// ──────────────────── Chủ câu lạc bộ quản lý thành viên ────────────────────

/** Chỉ chủ câu lạc bộ (hoặc quản trị viên) mới qua được cửa này. */
async function assertOwner(clubId: string) {
  const me = await actor();
  if ('error' in me) return { error: me.error } as const;
  const club = await db.club.findUnique({
    where: { id: clubId }, select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!club) return { error: 'Không tìm thấy câu lạc bộ.' } as const;
  if (club.ownerId !== me.id && !isStaff(me.role)) return { error: 'Bạn không có quyền với câu lạc bộ này.' } as const;
  return { me, club } as const;
}

export async function approveMember(memberId: string): Promise<ClubActionState> {
  const m = await db.clubMember.findUnique({
    where: { id: memberId }, select: { id: true, clubId: true, userId: true, status: true },
  });
  if (!m) return { error: 'Không tìm thấy đơn xin vào.' };

  const guard = await assertOwner(m.clubId);
  if ('error' in guard) return { error: guard.error };
  if (m.status === 'ACTIVE') return { ok: true };

  await db.$transaction(async (tx) => {
    await tx.clubMember.update({ where: { id: m.id }, data: { status: 'ACTIVE' }, select: { id: true } });
    await tx.club.update({ where: { id: m.clubId }, data: { memberCount: { increment: 1 } }, select: { id: true } });
    await notify(
      {
        userId: m.userId, type: 'CLUB', actorId: guard.me.id,
        title: 'Đơn xin vào câu lạc bộ đã được duyệt',
        content: guard.club.name, link: `/clb/${guard.club.slug}`,
      },
      tx,
    );
  });

  revalidatePath(`/clb/${guard.club.slug}`);
  return { ok: true };
}

/** Từ chối đơn, hoặc đuổi một thành viên đang có chân. */
export async function removeMember(memberId: string): Promise<ClubActionState> {
  const m = await db.clubMember.findUnique({
    where: { id: memberId }, select: { id: true, clubId: true, userId: true, status: true, role: true },
  });
  if (!m) return { ok: true };

  const guard = await assertOwner(m.clubId);
  if ('error' in guard) return { error: guard.error };
  if (m.role === 'OWNER') return { error: 'Không gỡ được chủ câu lạc bộ.' };

  await db.$transaction(async (tx) => {
    await tx.clubMember.delete({ where: { id: m.id }, select: { id: true } });
    if (m.status === 'ACTIVE') {
      await tx.club.update({ where: { id: m.clubId }, data: { memberCount: { decrement: 1 } }, select: { id: true } });
    }
  });

  revalidatePath(`/clb/${guard.club.slug}`);
  return { ok: true };
}

// ─────────────────────────── Bảng tin ───────────────────────────

export async function postToClub(_prev: ClubActionState, formData: FormData): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const clubId = String(formData.get('clubId') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  if (content.length < CLUB_POST_MIN) return { error: 'Nội dung quá ngắn.' };
  if (content.length > CLUB_POST_MAX) return { error: `Nội dung tối đa ${CLUB_POST_MAX} ký tự.` };

  const club = await db.club.findUnique({ where: { id: clubId }, select: { id: true, slug: true } });
  if (!club) return { error: 'Không tìm thấy câu lạc bộ.' };

  // Quyền đăng KHÔNG lấy theo giao diện: phải đang là thành viên đã được nhận.
  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: me.id } }, select: { status: true },
  });
  if (m?.status !== 'ACTIVE') return { error: 'Chỉ thành viên câu lạc bộ mới đăng được.' };

  await db.$transaction(async (tx) => {
    await tx.clubPost.create({
      data: { clubId, authorId: me.id, content: bbcodeToHtml(content), contentSource: content },
      select: { id: true },
    });
    await tx.club.update({ where: { id: clubId }, data: { postCount: { increment: 1 } }, select: { id: true } });
  });

  revalidatePath(`/clb/${club.slug}`);
  return { ok: true };
}

export async function deleteClubPost(postId: string): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const post = await db.clubPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, clubId: true, club: { select: { slug: true, ownerId: true } } },
  });
  if (!post) return { ok: true };

  const mine = post.authorId === me.id;
  if (!mine && post.club.ownerId !== me.id && !isStaff(me.role)) {
    return { error: 'Bạn không xoá được bài này.' };
  }

  await db.$transaction(async (tx) => {
    await tx.clubPost.delete({ where: { id: post.id }, select: { id: true } });
    await tx.club.update({ where: { id: post.clubId }, data: { postCount: { decrement: 1 } }, select: { id: true } });
  });

  revalidatePath(`/clb/${post.club.slug}`);
  return { ok: true };
}

// ─────────────────────────── Sửa / giải tán ───────────────────────────

export async function updateClub(_prev: ClubActionState, formData: FormData): Promise<ClubActionState> {
  const clubId = String(formData.get('clubId') ?? '');
  const guard = await assertOwner(clubId);
  if ('error' in guard) return { error: guard.error };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const avatar = String(formData.get('avatar') ?? '').trim();
  const joinMode = readMode(formData, 'joinMode', ['OPEN', 'APPROVAL', 'CLOSED'], 'OPEN');
  const privacy = readMode(formData, 'privacy', ['PUBLIC', 'MEMBERS'], 'PUBLIC');

  if (name.length < CLUB_NAME_MIN) return { error: `Tên câu lạc bộ tối thiểu ${CLUB_NAME_MIN} ký tự.` };
  if (name.length > CLUB_NAME_MAX) return { error: `Tên câu lạc bộ tối đa ${CLUB_NAME_MAX} ký tự.` };
  if (description.length > CLUB_DESC_MAX) return { error: `Giới thiệu tối đa ${CLUB_DESC_MAX} ký tự.` };

  await db.club.update({
    where: { id: clubId },
    data: {
      name, description: description || null, avatar: avatar || null,
      joinMode: joinMode as never, privacy: privacy as never,
    },
    select: { id: true },
  });

  revalidatePath(`/clb/${guard.club.slug}`);
  return { ok: true };
}

export async function deleteClub(clubId: string): Promise<ClubActionState> {
  const guard = await assertOwner(clubId);
  if ('error' in guard) return { error: guard.error };

  // Thành viên và bài trên bảng tin đi theo nhờ onDelete: Cascade.
  await db.club.delete({ where: { id: clubId }, select: { id: true } });

  revalidatePath('/clb');
  redirect('/clb');
}
