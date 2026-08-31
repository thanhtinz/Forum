'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { notify } from '@/lib/notify';
import { bbcodeToHtml } from '@/lib/bbcode';
import { getActiveBan, banMessage } from '@/lib/ban';
import { AnhKhongHopLeError, nhanAnhVaoKho } from '@/lib/nhan-anh';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  clubSlug, getClubConfig,
  CLUBS_OWNED_MAX, CLUB_NAME_MIN, CLUB_NAME_MAX, CLUB_DESC_MAX,
  CLUB_SHORT_MIN, CLUB_SHORT_MAX, isClubShortName, normClubShortName, suggestClubShortName,
  CLUB_POST_MIN, CLUB_POST_MAX, CLUB_COMMENT_MAX, CLUB_COMMENT_DEPTH_MAX,
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

/**
 * Ảnh đại diện nhóm được in thẳng vào `src` của thẻ <img> ở trang câu lạc bộ,
 * nên phải kiểm dạng NGAY LÚC LƯU như trang cài đặt cá nhân vẫn làm: không
 * kiểm thì một chuỗi `javascript:`/`data:` bất kỳ cũng vào được cột này, mà
 * chỗ hiện nó thì chẳng còn dịp nào để hỏi lại.
 */
const LOI_ANH = 'Ảnh đại diện phải là URL hợp lệ hoặc ảnh đã tải lên.';

function readMode(fd: FormData, key: string, allowed: string[], fallback: string): string {
  const v = String(fd.get(key) ?? '');
  return allowed.includes(v) ? v : fallback;
}

const LOI_VIET_TAT =
  `Viết tắt phải dài ${CLUB_SHORT_MIN}–${CLUB_SHORT_MAX} ký tự, chỉ gồm chữ cái không dấu và số.`;

// ─────────────────────────── Lập câu lạc bộ ───────────────────────────

export async function createClub(_prev: ClubActionState, formData: FormData): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const avatar = String(formData.get('avatar') ?? '').trim();
  const joinMode = readMode(formData, 'joinMode', ['OPEN', 'APPROVAL', 'CLOSED'], 'OPEN');
  const privacy = readMode(formData, 'privacy', ['PUBLIC', 'MEMBERS'], 'PUBLIC');
  // Bỏ trống thì tự đoán từ tên, để không ai lập nhóm mà thiếu mất cái thẻ.
  const shortRaw = String(formData.get('shortName') ?? '').trim();
  const shortName = normClubShortName(shortRaw) || suggestClubShortName(name);

  if (name.length < CLUB_NAME_MIN) return { error: `Tên câu lạc bộ tối thiểu ${CLUB_NAME_MIN} ký tự.` };
  if (name.length > CLUB_NAME_MAX) return { error: `Tên câu lạc bộ tối đa ${CLUB_NAME_MAX} ký tự.` };
  if (description.length > CLUB_DESC_MAX) return { error: `Giới thiệu tối đa ${CLUB_DESC_MAX} ký tự.` };
  // Ảnh dán từ ngoài được tải về kho của mình, không lưu địa chỉ người khác.
  let anh: string | null;
  try {
    anh = await nhanAnhVaoKho(avatar);
  } catch (e) {
    return { error: e instanceof AnhKhongHopLeError ? e.message : LOI_ANH };
  }
  if (!isClubShortName(shortName)) return { error: LOI_VIET_TAT };

  const trungTat = await db.club.findUnique({ where: { shortName }, select: { name: true } });
  if (trungTat) return { error: `Viết tắt “${shortName}” đã có nhóm “${trungTat.name}” dùng rồi.` };

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
          slug, name, shortName, description: description || null, avatar: anh,
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
    where: { id: clubId },
    select: { id: true, slug: true, name: true, ownerId: true, joinMode: true, privacy: true, shortName: true },
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
    // Điều kiện "còn đang chờ" nằm TRONG `where` chứ không đọc rồi mới ghi:
    // chủ nhóm mở hai tab danh sách chờ rồi bấm Duyệt cùng một đơn thì hàng
    // `ClubMember` chỉ đổi một lần, nhưng `memberCount` cộng hai lần và sai
    // vĩnh viễn. Xét `count` rồi mới cộng, y như `xetDuyet` ở trang trắc nghiệm.
    const ghi = await tx.clubMember.updateMany({
      where: { id: m.id, status: 'PENDING' }, data: { status: 'ACTIVE' },
    });
    if (ghi.count === 0) return;

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

  const han = await checkRateLimit('clubPost', me.id);
  if (!han.allowed) return { error: han.message };

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
  // Sửa thì thiếu trường phải GIỮ NGUYÊN, không được rơi về hằng số.
  //
  // `readMode` không phân biệt "biểu mẫu không gửi trường này" với "gửi giá trị
  // sai", cả hai đều trả về mặc định. Ở lúc lập nhóm thì mặc định là đúng
  // nghĩa; ở lúc sửa thì nó biến một câu lạc bộ đang kín thành công khai mà
  // chẳng ai bấm gì — chỉ cần một ô chọn bị `disabled` (trình duyệt không gửi
  // field bị disable) hay một biểu mẫu sửa từng phần là dính.
  const joinMode = readMode(formData, 'joinMode', ['OPEN', 'APPROVAL', 'CLOSED'], guard.club.joinMode);
  const privacy = readMode(formData, 'privacy', ['PUBLIC', 'MEMBERS'], guard.club.privacy);

  if (name.length < CLUB_NAME_MIN) return { error: `Tên câu lạc bộ tối thiểu ${CLUB_NAME_MIN} ký tự.` };
  if (name.length > CLUB_NAME_MAX) return { error: `Tên câu lạc bộ tối đa ${CLUB_NAME_MAX} ký tự.` };
  if (description.length > CLUB_DESC_MAX) return { error: `Giới thiệu tối đa ${CLUB_DESC_MAX} ký tự.` };
  let anh: string | null;
  try {
    anh = await nhanAnhVaoKho(avatar);
  } catch (e) {
    return { error: e instanceof AnhKhongHopLeError ? e.message : LOI_ANH };
  }

  // Cùng lẽ trên: thiếu trường thì giữ nguyên viết tắt đang có.
  const shortRaw = String(formData.get('shortName') ?? '').trim();
  const shortName = shortRaw ? normClubShortName(shortRaw) : (guard.club.shortName ?? '');
  if (!isClubShortName(shortName)) return { error: LOI_VIET_TAT };
  if (shortName !== guard.club.shortName) {
    const trung = await db.club.findUnique({ where: { shortName }, select: { name: true } });
    if (trung) return { error: `Viết tắt “${shortName}” đã có nhóm “${trung.name}” dùng rồi.` };
  }

  await db.club.update({
    where: { id: clubId },
    data: {
      name, shortName, description: description || null, avatar: anh,
      joinMode: joinMode as never, privacy: privacy as never,
    },
    select: { id: true },
  });

  // Cái thẻ viết tắt đeo cạnh tên MỌI thành viên, nên đổi nó là đổi trang của
  // tất cả — làm mới cả trang danh bạ và trang chủ cho khỏi hiện thẻ cũ.
  revalidatePath('/thanh-vien');
  revalidatePath('/');

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

// ─────────────── Thích / bình luận / ghim bài bảng tin ───────────────

/**
 * Ai được động vào bài của nhóm: chủ, phó, và ban điều hành.
 *
 * Trả kèm bài để nơi gọi khỏi hỏi lại cơ sở dữ liệu lần nữa.
 */
async function assertCanManagePost(postId: string) {
  const me = await actor();
  if ('error' in me) return { error: me.error } as const;

  const post = await db.clubPost.findUnique({
    where: { id: postId },
    select: {
      id: true, clubId: true, authorId: true, pinned: true,
      club: { select: { slug: true, ownerId: true } },
    },
  });
  if (!post) return { error: 'Không tìm thấy bài.' } as const;

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: post.clubId, userId: me.id } },
    select: { role: true, status: true },
  });
  const manages = (m?.status === 'ACTIVE' && (m.role === 'OWNER' || m.role === 'MOD'))
    || post.club.ownerId === me.id
    || isStaff(me.role);

  return { me, post, manages } as const;
}

/** Thích / bỏ thích một bài trên bảng tin. Chỉ thành viên. */
export async function toggleClubPostLike(postId: string): Promise<ClubActionState & { liked?: boolean; count?: number }> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const post = await db.clubPost.findUnique({
    where: { id: postId }, select: { id: true, clubId: true, club: { select: { slug: true } } },
  });
  if (!post) return { error: 'Không tìm thấy bài.' };

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: post.clubId, userId: me.id } }, select: { status: true },
  });
  if (m?.status !== 'ACTIVE') return { error: 'Chỉ thành viên câu lạc bộ mới thích được.' };

  const existing = await db.clubPostLike.findUnique({
    where: { postId_userId: { postId, userId: me.id } }, select: { id: true },
  });

  const after = await db.$transaction(async (tx) => {
    if (existing) {
      await tx.clubPostLike.delete({ where: { id: existing.id }, select: { id: true } });
      return tx.clubPost.update({
        where: { id: postId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true },
      });
    }
    await tx.clubPostLike.create({ data: { postId, userId: me.id }, select: { id: true } });
    return tx.clubPost.update({
      where: { id: postId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true },
    });
  });

  revalidatePath(`/clb/${post.club.slug}`);
  return { ok: true, liked: !existing, count: after.likeCount };
}

export async function addClubComment(_prev: ClubActionState, formData: FormData): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const postId = String(formData.get('postId') ?? '');
  const parentId = String(formData.get('parentId') ?? '').trim() || null;
  const content = String(formData.get('content') ?? '').trim();
  if (!content) return { error: 'Chưa nhập nội dung.' };
  if (content.length > CLUB_COMMENT_MAX) return { error: `Bình luận tối đa ${CLUB_COMMENT_MAX} ký tự.` };

  const post = await db.clubPost.findUnique({
    where: { id: postId }, select: { id: true, clubId: true, authorId: true, club: { select: { slug: true, name: true } } },
  });
  if (!post) return { error: 'Không tìm thấy bài.' };

  const han = await checkRateLimit('clubComment', me.id);
  if (!han.allowed) return { error: han.message };

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: post.clubId, userId: me.id } }, select: { status: true },
  });
  if (m?.status !== 'ACTIVE') return { error: 'Chỉ thành viên câu lạc bộ mới bình luận được.' };

  /**
   * Chỗ treo của bình luận mới.
   *
   * Trả lời ở tầng cuối thì bám vào chính tầng ấy (cha của nó là cha của người
   * được trả lời), chứ không đẻ thêm tầng — nếu không thì một cuộc đối đáp dài
   * sẽ thụt lề mãi tới lúc chỉ còn một chữ mỗi dòng trên điện thoại.
   */
  let parent: { id: string; postId: string; depth: number; parentId: string | null; rootId: string | null; authorId: string } | null = null;
  if (parentId) {
    parent = await db.clubComment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, depth: true, parentId: true, rootId: true, authorId: true },
    });
    if (!parent || parent.postId !== postId) return { error: 'Không tìm thấy bình luận được trả lời.' };
  }

  const depth = parent ? Math.min(parent.depth + 1, CLUB_COMMENT_DEPTH_MAX - 1) : 0;
  const treeParentId = parent
    ? (depth > parent.depth ? parent.id : parent.parentId)
    : null;
  const rootId = parent ? (parent.rootId ?? parent.id) : null;

  // Người được trả lời cũng phải biết, không chỉ chủ bài.
  const tell = new Set<string>();
  if (post.authorId !== me.id) tell.add(post.authorId);
  if (parent && parent.authorId !== me.id) tell.add(parent.authorId);

  await db.$transaction(async (tx) => {
    await tx.clubComment.create({
      data: { postId, authorId: me.id, content, parentId: treeParentId, rootId, depth },
      select: { id: true },
    });
    await tx.clubPost.update({
      where: { id: postId }, data: { commentCount: { increment: 1 } }, select: { id: true },
    });
    for (const userId of tell) {
      await notify(
        {
          userId, type: 'CLUB', actorId: me.id,
          title: userId === parent?.authorId
            ? 'Có người trả lời bình luận của bạn'
            : 'Có người bình luận bài của bạn trong câu lạc bộ',
          content: post.club.name, link: `/clb/${post.club.slug}`,
        },
        tx,
      );
    }
  });

  revalidatePath(`/clb/${post.club.slug}`);
  return { ok: true };
}

/** Thả tim / bỏ tim một bình luận. Chỉ thành viên. */
export async function toggleClubCommentLike(commentId: string): Promise<ClubActionState & { liked?: boolean; count?: number }> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const c = await db.clubComment.findUnique({
    where: { id: commentId },
    select: { id: true, post: { select: { clubId: true, club: { select: { slug: true } } } } },
  });
  if (!c) return { error: 'Không tìm thấy bình luận.' };

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: c.post.clubId, userId: me.id } }, select: { status: true },
  });
  if (m?.status !== 'ACTIVE') return { error: 'Chỉ thành viên câu lạc bộ mới thả tim được.' };

  const existing = await db.clubCommentLike.findUnique({
    where: { commentId_userId: { commentId, userId: me.id } }, select: { id: true },
  });

  const after = await db.$transaction(async (tx) => {
    if (existing) {
      await tx.clubCommentLike.delete({ where: { id: existing.id }, select: { id: true } });
      return tx.clubComment.update({
        where: { id: commentId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true },
      });
    }
    await tx.clubCommentLike.create({ data: { commentId, userId: me.id }, select: { id: true } });
    return tx.clubComment.update({
      where: { id: commentId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true },
    });
  });

  revalidatePath(`/clb/${c.post.club.slug}`);
  return { ok: true, liked: !existing, count: Math.max(0, after.likeCount) };
}

export async function deleteClubComment(commentId: string): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const c = await db.clubComment.findUnique({
    where: { id: commentId },
    select: {
      id: true, authorId: true, postId: true, rootId: true,
      post: { select: { clubId: true, club: { select: { slug: true, ownerId: true } } } },
    },
  });
  if (!c) return { ok: true };

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: c.post.clubId, userId: me.id } }, select: { role: true, status: true },
  });
  const manages = m?.status === 'ACTIVE' && (m.role === 'OWNER' || m.role === 'MOD');
  if (c.authorId !== me.id && !manages && !isStaff(me.role)) {
    return { error: 'Bạn không xoá được bình luận này.' };
  }

  // Xoá một bình luận là mất cả nhánh dưới nó (ràng buộc Cascade), nên bộ đếm
  // phải trừ đủ chừng ấy chứ không phải trừ một.
  const rootOfBranch = c.rootId ?? c.id;
  const inBranch = c.rootId
    ? 1 + (await db.clubComment.count({ where: { rootId: rootOfBranch, parentId: c.id } }))
    : 1 + (await db.clubComment.count({ where: { rootId: c.id } }));

  await db.$transaction(async (tx) => {
    await tx.clubComment.delete({ where: { id: c.id }, select: { id: true } });
    await tx.clubPost.update({
      where: { id: c.postId }, data: { commentCount: { decrement: inBranch } }, select: { id: true },
    });
  });

  revalidatePath(`/clb/${c.post.club.slug}`);
  return { ok: true };
}

/** Ghim / bỏ ghim một bài lên đầu bảng tin. Chủ và phó nhóm. */
export async function toggleClubPostPin(postId: string): Promise<ClubActionState> {
  const guard = await assertCanManagePost(postId);
  if ('error' in guard) return { error: guard.error };
  if (!guard.manages) return { error: 'Chỉ chủ hoặc phó câu lạc bộ mới ghim được bài.' };

  await db.clubPost.update({
    where: { id: postId }, data: { pinned: !guard.post.pinned }, select: { id: true },
  });

  revalidatePath(`/clb/${guard.post.club.slug}`);
  return { ok: true };
}

// ─────────────── Phó nhóm, mời bạn ───────────────

/** Chủ nhóm phong hoặc gỡ chức phó cho một thành viên. */
export async function setMemberRole(memberId: string, role: 'MOD' | 'MEMBER'): Promise<ClubActionState> {
  const m = await db.clubMember.findUnique({
    where: { id: memberId }, select: { id: true, clubId: true, userId: true, role: true, status: true },
  });
  if (!m) return { error: 'Không tìm thấy thành viên.' };
  if (m.role === 'OWNER') return { error: 'Chủ câu lạc bộ không đổi vai trò được.' };
  if (m.status !== 'ACTIVE') return { error: 'Người này chưa phải thành viên.' };

  // Phong phó là việc riêng của CHỦ nhóm: để phó tự phong nhau thì chỉ cần một
  // người bị chọn nhầm là cả nhóm mất kiểm soát.
  const guard = await assertOwner(m.clubId);
  if ('error' in guard) return { error: guard.error };
  if (guard.club.ownerId !== guard.me.id && !isStaff(guard.me.role)) {
    return { error: 'Chỉ chủ câu lạc bộ mới phong phó.' };
  }

  await db.clubMember.update({ where: { id: m.id }, data: { role }, select: { id: true } });
  await notify({
    userId: m.userId, type: 'CLUB', actorId: guard.me.id,
    title: role === 'MOD' ? 'Bạn được phong phó câu lạc bộ' : 'Bạn thôi làm phó câu lạc bộ',
    content: guard.club.name, link: `/clb/${guard.club.slug}`,
  });

  revalidatePath(`/clb/${guard.club.slug}`);
  return { ok: true };
}

/** Chủ hoặc phó nhóm mời một người bạn vào nhóm. */
export async function inviteToClub(clubId: string, userId: string): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const club = await db.club.findUnique({
    where: { id: clubId }, select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!club) return { error: 'Không tìm thấy câu lạc bộ.' };

  const mine = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: me.id } }, select: { role: true, status: true },
  });
  const manages = mine?.status === 'ACTIVE' && (mine.role === 'OWNER' || mine.role === 'MOD');
  if (!manages) return { error: 'Chỉ chủ hoặc phó câu lạc bộ mới mời được người.' };

  const existing = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } }, select: { id: true },
  });
  if (existing) return { ok: true };

  // Lời mời sinh ra một thông báo đi thẳng tới người kia, nên nó cũng là một
  // đường nhắn tin: bỏ qua chặn ở đây thì chủ nhóm mời đi mời lại là quấy rối
  // được đúng người đã chặn mình.
  if (await isBlockedBetween(me.id, userId)) return { error: BLOCK_MESSAGE };

  try {
    await db.$transaction(async (tx) => {
      await tx.clubMember.create({
        data: { clubId, userId, status: 'INVITED', invitedById: me.id }, select: { id: true },
      });
      await notify(
        {
          userId, type: 'CLUB', actorId: me.id,
          title: 'Bạn được mời vào câu lạc bộ', content: club.name, link: `/clb/${club.slug}`,
        },
        tx,
      );
    });
  } catch {
    return { error: 'Không mời được, vui lòng thử lại.' };
  }

  revalidatePath(`/clb/${club.slug}`);
  return { ok: true };
}

/** Người được mời nhận lời hoặc từ chối. */
export async function respondInvite(clubId: string, accept: boolean): Promise<ClubActionState> {
  const me = await actor();
  if ('error' in me) return { error: me.error };

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: me.id } },
    select: { id: true, status: true, invitedById: true, club: { select: { slug: true, name: true } } },
  });
  if (!m || m.status !== 'INVITED') return { error: 'Không có lời mời nào đang chờ bạn.' };

  await db.$transaction(async (tx) => {
    if (!accept) {
      await tx.clubMember.delete({ where: { id: m.id }, select: { id: true } });
      return;
    }
    // Cùng lý do với `approveMember`: bấm "Đồng ý" hai lần (hai tab, hay một
    // cú nhấp đúp) thì trạng thái chỉ đổi một lần mà bộ đếm cộng hai.
    const ghi = await tx.clubMember.updateMany({
      where: { id: m.id, status: 'INVITED' }, data: { status: 'ACTIVE' },
    });
    if (ghi.count === 0) return;

    await tx.club.update({ where: { id: clubId }, data: { memberCount: { increment: 1 } }, select: { id: true } });
    if (m.invitedById) {
      await notify(
        {
          userId: m.invitedById, type: 'CLUB', actorId: me.id,
          title: 'Lời mời vào câu lạc bộ đã được nhận',
          content: m.club.name, link: `/clb/${m.club.slug}`,
        },
        tx,
      );
    }
  });

  revalidatePath(`/clb/${m.club.slug}`);
  return { ok: true };
}
