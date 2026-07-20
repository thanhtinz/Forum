'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints } from '@/lib/points';
import { addExp } from '@/lib/level';
import { notify } from '@/lib/notify';
import { isVipActive } from '@/lib/access';

const POINTS_PER_THREAD = 10;
const POINTS_PER_REPLY = 2;
const EXP_PER_THREAD = 10;
const EXP_PER_REPLY = 4;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Văn bản → các đoạn <p> đã escape (an toàn, chống XSS). */
function toParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p>${escapeHtml(b).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'the';
}

// ─────────────────────────── Đăng chủ đề ───────────────────────────

export interface ThreadState {
  error?: string;
}

export async function createThread(_prev: ThreadState, formData: FormData): Promise<ThreadState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để đăng chủ đề.' };

  const forumSlug = String(formData.get('forumSlug') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const tagRaw = String(formData.get('tags') ?? '');

  if (title.length < 5) return { error: 'Tiêu đề tối thiểu 5 ký tự.' };
  if (title.length > 200) return { error: 'Tiêu đề tối đa 200 ký tự.' };
  if (content.length < 10) return { error: 'Nội dung quá ngắn (tối thiểu 10 ký tự).' };

  const forum = await db.forum.findUnique({
    where: { slug: forumSlug },
    select: { id: true, slug: true, vipOnly: true, postAccess: true, minLevel: true },
  });
  if (!forum) return { error: 'Không tìm thấy diễn đàn.' };

  // Kiểm tra quyền đăng
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { level: true, vipTier: true, vipExpiresAt: true, vipPermanent: true },
  });
  if (forum.vipOnly && !(me && isVipActive(me))) return { error: 'Diễn đàn này chỉ dành cho thành viên VIP.' };
  if (me && me.level < forum.minLevel) return { error: `Bạn cần đạt cấp ${forum.minLevel} để đăng ở diễn đàn này.` };

  let threadId = '';
  await db.$transaction(async (tx) => {
    const thread = await tx.thread.create({
      data: {
        forumId: forum.id,
        authorId: userId,
        title,
        content: toParagraphs(content),
        status: 'PUBLISHED',
        lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    threadId = thread.id;

    // Thẻ (tối đa 6)
    const tagNames = [...new Set(tagRaw.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 6);
    for (const name of tagNames) {
      const tslug = toSlug(name);
      const tag = await tx.tag.upsert({ where: { slug: tslug }, update: {}, create: { slug: tslug, name } });
      await tx.tagsOnThreads.create({ data: { threadId: thread.id, tagId: tag.id } }).catch(() => {});
    }

    await tx.forum.update({ where: { id: forum.id }, data: { threadCount: { increment: 1 } } });
    await grantPoints({ userId, amount: POINTS_PER_THREAD, reason: 'THREAD_CREATE', refId: thread.id, note: `Đăng chủ đề: ${title}` }, tx);
    await addExp(userId, EXP_PER_THREAD, tx);
  });

  revalidatePath(`/forum/${forum.slug}`);
  redirect(`/forum/${forum.slug}/${threadId}`);
}

// ─────────────────────────── Trả lời ───────────────────────────

export interface ReplyState {
  ok?: boolean;
  error?: string;
}

export async function addReply(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để trả lời.' };

  const threadId = String(formData.get('threadId') ?? '');
  const parentId = String(formData.get('parentId') ?? '') || null;
  const content = String(formData.get('content') ?? '').trim();

  if (!threadId) return { error: 'Thiếu thông tin chủ đề.' };
  if (content.length < 2) return { error: 'Nội dung trả lời quá ngắn.' };
  if (content.length > 5000) return { error: 'Trả lời tối đa 5000 ký tự.' };

  const thread = await db.thread.findUnique({
    where: { id: threadId },
    select: { id: true, locked: true, authorId: true, title: true, forum: { select: { slug: true, id: true } } },
  });
  if (!thread) return { error: 'Không tìm thấy chủ đề.' };
  if (thread.locked) return { error: 'Chủ đề đã bị khoá, không thể trả lời.' };

  // Nếu là phản hồi lồng, xác định người được phản hồi để báo tin
  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await db.reply.findUnique({ where: { id: parentId }, select: { authorId: true, threadId: true } });
    if (!parent || parent.threadId !== threadId) return { error: 'Phản hồi không hợp lệ.' };
    parentAuthorId = parent.authorId;
  }

  await db.$transaction(async (tx) => {
    await tx.reply.create({ data: { threadId, authorId: userId, content, parentId } });
    await tx.thread.update({ where: { id: threadId }, data: { replyCount: { increment: 1 }, lastReplyAt: new Date() } });
    await tx.forum.update({ where: { id: thread.forum.id }, data: { replyCount: { increment: 1 } } });
    await grantPoints({ userId, amount: POINTS_PER_REPLY, reason: 'REPLY_CREATE', refId: threadId, note: `Trả lời: ${thread.title}` }, tx);
    await addExp(userId, EXP_PER_REPLY, tx);

    const link = `/forum/${thread.forum.slug}/${threadId}`;
    // Báo cho chủ chủ đề
    if (thread.authorId !== userId) {
      await notify({ userId: thread.authorId, type: 'REPLY', title: 'Có trả lời mới trong chủ đề của bạn', content: thread.title, link, actorId: userId }, tx);
    }
    // Báo cho người được phản hồi (nếu khác chủ chủ đề & khác chính mình)
    if (parentAuthorId && parentAuthorId !== userId && parentAuthorId !== thread.authorId) {
      await notify({ userId: parentAuthorId, type: 'REPLY', title: 'Có người phản hồi bình luận của bạn', content: thread.title, link, actorId: userId }, tx);
    }
  });

  revalidatePath(`/forum/${thread.forum.slug}/${threadId}`);
  return { ok: true };
}

// ─────────────────────────── Thích ───────────────────────────

export interface ToggleState {
  active: boolean;
  count: number;
  error?: string;
}

export async function toggleThreadLike(threadId: string): Promise<ToggleState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const existing = await db.reaction.findFirst({ where: { userId, threadId, type: 'LIKE' }, select: { id: true } });
  const t = await db.$transaction(async (tx) => {
    if (existing) {
      await tx.reaction.delete({ where: { id: existing.id } });
      return tx.thread.update({ where: { id: threadId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
    }
    await tx.reaction.create({ data: { userId, threadId, type: 'LIKE' } });
    return tx.thread.update({ where: { id: threadId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
  });
  return { active: !existing, count: Math.max(0, t.likeCount) };
}

export async function toggleReplyLike(replyId: string): Promise<ToggleState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const existing = await db.reaction.findFirst({ where: { userId, replyId, type: 'LIKE' }, select: { id: true } });
  const r = await db.$transaction(async (tx) => {
    if (existing) {
      await tx.reaction.delete({ where: { id: existing.id } });
      return tx.reply.update({ where: { id: replyId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
    }
    await tx.reaction.create({ data: { userId, replyId, type: 'LIKE' } });
    return tx.reply.update({ where: { id: replyId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
  });
  return { active: !existing, count: Math.max(0, r.likeCount) };
}

// ─────────────────────── Chọn câu trả lời (lời giải) ───────────────────────

export interface SolutionState {
  ok?: boolean;
  error?: string;
}

/** Chủ chủ đề chọn một trả lời làm lời giải; chuyển điểm treo thưởng (nếu có). */
export async function markSolution(threadId: string, replyId: string): Promise<SolutionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const thread = await db.thread.findUnique({
    where: { id: threadId },
    select: { authorId: true, solvedReplyId: true, bountyPoints: true, title: true, forum: { select: { slug: true } } },
  });
  if (!thread) return { error: 'Không tìm thấy chủ đề.' };
  if (thread.authorId !== userId) return { error: 'Chỉ người tạo chủ đề mới được chọn lời giải.' };
  if (thread.solvedReplyId) return { error: 'Chủ đề đã có lời giải được chọn.' };

  const reply = await db.reply.findUnique({ where: { id: replyId }, select: { authorId: true, threadId: true } });
  if (!reply || reply.threadId !== threadId) return { error: 'Trả lời không hợp lệ.' };

  await db.$transaction(async (tx) => {
    await tx.thread.update({ where: { id: threadId }, data: { solvedReplyId: replyId } });
    await tx.reply.update({ where: { id: replyId }, data: { isSolution: true } });

    // Chuyển điểm treo thưởng: trừ của chủ chủ đề (nếu đủ), cộng cho người trả lời
    const bounty = thread.bountyPoints ?? 0;
    if (bounty > 0 && reply.authorId !== userId) {
      try {
        await grantPoints({ userId, amount: -bounty, reason: 'BOUNTY_PAID', refId: threadId, note: `Trả thưởng chủ đề: ${thread.title}` }, tx);
        await grantPoints({ userId: reply.authorId, amount: bounty, reason: 'BOUNTY_RECEIVED', refId: threadId, note: `Nhận thưởng lời giải: ${thread.title}` }, tx);
      } catch {
        // chủ chủ đề không đủ điểm — vẫn ghi nhận lời giải, bỏ qua thưởng
      }
    }

    if (reply.authorId !== userId) {
      await notify({
        userId: reply.authorId, type: 'SYSTEM',
        title: bounty > 0 ? `Trả lời của bạn được chọn làm lời giải (+${bounty}đ)` : 'Trả lời của bạn được chọn làm lời giải',
        content: thread.title, link: `/forum/${thread.forum.slug}/${threadId}`, actorId: userId,
      }, tx);
    }
  });

  revalidatePath(`/forum/${thread.forum.slug}/${threadId}`);
  return { ok: true };
}
