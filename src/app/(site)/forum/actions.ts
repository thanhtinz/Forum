'use server';

import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { recountForum, recountForums, recountThread } from '@/lib/forum-counters';
import { grantPoints } from '@/lib/points';
import { addExp } from '@/lib/level';
import { notify, filterNotifiable } from '@/lib/notify';
import { canModerateForum } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/rate-limit';
import { bbcodeToHtml, hideRules } from '@/lib/bbcode';
import { authorShareOf } from '@/lib/revenue-share';
import { resolveMentions, notifyMentions } from '@/lib/mention-notify';
import { getActiveBan, banMessage } from '@/lib/ban';
import { readPollForm, isPollClosed } from '@/lib/poll';
import { readBounty, BOUNTY_MIN } from '@/lib/bounty';
import { checkForumPostAccess } from '@/lib/forum-post-access';
import { markAllThreadsRead } from '@/lib/thread-read';
import { InsufficientPointsError } from '@/lib/points';
import { THANKS_NAMES_SHOWN, DONATE_MIN, DONATE_MAX, type ThanksState, type DonateState } from '@/lib/thanks';

const POINTS_PER_THREAD = 10;
const POINTS_PER_REPLY = 2;
const EXP_PER_THREAD = 10;
const EXP_PER_REPLY = 4;
/** Chủ đề đông người theo dõi thì chỉ báo cho ngần này người mỗi lần trả lời. */
const FOLLOWER_NOTIFY_LIMIT = 200;

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

  const banned = await getActiveBan(userId, 'POST');
  if (banned) return { error: banMessage(banned, 'đăng bài') };

  const rate = await checkRateLimit('thread', userId);
  if (!rate.allowed) return { error: rate.message };

  const forumSlug = String(formData.get('forumSlug') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const tagRaw = String(formData.get('tags') ?? '');

  if (title.length < 5) return { error: 'Tiêu đề tối thiểu 5 ký tự.' };
  if (title.length > 200) return { error: 'Tiêu đề tối đa 200 ký tự.' };
  if (content.length < 10) return { error: 'Nội dung quá ngắn (tối thiểu 10 ký tự).' };

  const forum = await db.forum.findUnique({
    where: { slug: forumSlug },
    select: { id: true, slug: true, postAccess: true, minLevel: true },
  });
  if (!forum) return { error: 'Không tìm thấy diễn đàn.' };

  // Kiểm tra quyền đăng: quyền của khu vực, mức VIP và cấp độ tối thiểu
  const denied = await checkForumPostAccess(userId, forum);
  if (denied) return { error: denied };

  const pollForm = readPollForm(formData);
  if (pollForm.error) return { error: pollForm.error };

  const bountyForm = readBounty(formData.get('bounty'));
  if (bountyForm.error) return { error: bountyForm.error };
  const bounty = bountyForm.bounty ?? 0;

  // Điểm thưởng bị giữ ngay lúc đăng, nên phải đủ điểm từ bây giờ. Cộng thêm
  // phần thưởng đăng bài vì phần đó chỉ có sau khi chủ đề được tạo.
  if (bounty > 0) {
    const wallet = await db.user.findUnique({ where: { id: userId }, select: { points: true } });
    if ((wallet?.points ?? 0) + POINTS_PER_THREAD < bounty) {
      return { error: `Bạn chỉ có ${wallet?.points ?? 0} điểm, không đủ để treo thưởng ${bounty} điểm.` };
    }
  }

  const mentioned = await resolveMentions(content, userId);

  let threadId = '';
  await db.$transaction(async (tx) => {
    const thread = await tx.thread.create({
      data: {
        forumId: forum.id,
        authorId: userId,
        title,
        content: bbcodeToHtml(content),
        contentSource: content,
        status: 'PUBLISHED',
        bountyPoints: bounty > 0 ? bounty : null,
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
    await autoFollow(thread.id, userId, tx);

    // Giữ điểm ngay khi treo thưởng, không thì người đăng tiêu hết rồi tới lúc
    // chọn lời giải mới phát hiện không đủ, người trả lời chịu thiệt.
    if (bounty > 0) {
      await grantPoints({ userId, amount: -bounty, reason: 'BOUNTY_PAID', refId: thread.id, note: `Treo thưởng chủ đề: ${title}` }, tx);
    }

    if (pollForm.poll) {
      await tx.poll.create({
        data: {
          threadId: thread.id,
          question: pollForm.poll.question,
          multiple: pollForm.poll.multiple,
          closesAt: pollForm.poll.hours > 0 ? new Date(Date.now() + pollForm.poll.hours * 3600_000) : null,
          options: { create: pollForm.poll.options.map((text, order) => ({ text, order })) },
        },
        select: { id: true },
      });
    }
  });

  // Ngoài transaction vì phải có id chủ đề mới dựng được liên kết.
  await notifyMentions(mentioned, {
    title: 'Có người nhắc tên bạn', content: title,
    link: `/forum/${forum.slug}/${threadId}`, actorId: userId,
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

  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'bình luận') };

  const rate = await checkRateLimit('reply', userId);
  if (!rate.allowed) return { error: rate.message };

  const threadId = String(formData.get('threadId') ?? '');
  const parentId = String(formData.get('parentId') ?? '') || null;
  const content = String(formData.get('content') ?? '').trim();

  if (!threadId) return { error: 'Thiếu thông tin chủ đề.' };
  if (content.length < 2) return { error: 'Nội dung trả lời quá ngắn.' };
  if (content.length > 5000) return { error: 'Trả lời tối đa 5000 ký tự.' };

  const thread = await db.thread.findUnique({
    where: { id: threadId },
    select: { id: true, locked: true, status: true, authorId: true, title: true, forum: { select: { slug: true, id: true } } },
  });
  if (!thread) return { error: 'Không tìm thấy chủ đề.' };
  if (thread.locked) return { error: 'Chủ đề đã bị khoá, không thể trả lời.' };
  // Chủ đề đã ẩn hoặc còn chờ duyệt thì không ai đọc được trả lời, mà bộ đếm
  // của chuyên mục chỉ tính chủ đề đang hiện — cộng vào là lệch ngay.
  if (thread.status !== 'PUBLISHED') return { error: 'Chủ đề này không còn nhận trả lời.' };

  // Nếu là phản hồi lồng, xác định người được phản hồi để báo tin
  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await db.reply.findUnique({ where: { id: parentId }, select: { authorId: true, threadId: true } });
    if (!parent || parent.threadId !== threadId) return { error: 'Phản hồi không hợp lệ.' };
    parentAuthorId = parent.authorId;
  }

  // Tìm người được nhắc tên trước khi vào transaction, để phần ghi dữ liệu
  // không phải chờ mấy truy vấn tra tên và kiểm tra chặn.
  const mentioned = await resolveMentions(content, userId, [thread.authorId, parentAuthorId]);

  // Người theo dõi chủ đề, trừ những ai đã được báo bằng thông báo khác.
  const alreadyNotified = new Set([userId, thread.authorId, parentAuthorId, ...mentioned.map((m) => m.id)]);
  const followers = await filterNotifiable(
    (await db.threadFollow.findMany({
      where: { threadId }, select: { userId: true }, take: FOLLOWER_NOTIFY_LIMIT,
    })).map((f) => f.userId).filter((id) => !alreadyNotified.has(id)),
    'REPLY',
  );

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
    // Báo cho những người được nhắc tên bằng @
    await notifyMentions(mentioned, { title: 'Có người nhắc tên bạn', content: thread.title, link, actorId: userId }, tx);
    // Báo cho người đang theo dõi chủ đề — gộp một lần ghi, danh sách đã lọc sẵn
    if (followers.length > 0) {
      await tx.notification.createMany({
        data: followers.map((followerId) => ({
          userId: followerId, type: 'REPLY' as const,
          title: 'Chủ đề bạn theo dõi có trả lời mới', content: thread.title, link, actorId: userId,
        })),
      });
    }
    // Đã trả lời thì mặc định theo dõi tiếp diễn biến
    await autoFollow(threadId, userId, tx);
  });

  revalidatePath(`/forum/${thread.forum.slug}/${threadId}`);
  return { ok: true };
}

// ─────────────────────────── Theo dõi chủ đề ───────────────────────────

export interface FollowState {
  following: boolean;
  count: number;
  error?: string;
}

export async function toggleThreadFollow(threadId: string): Promise<FollowState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { following: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const existing = await db.threadFollow.findUnique({
    where: { threadId_userId: { threadId, userId } }, select: { id: true },
  });
  if (existing) await db.threadFollow.delete({ where: { id: existing.id } });
  else {
    const thread = await db.thread.findUnique({ where: { id: threadId }, select: { id: true } });
    if (!thread) return { following: false, count: 0, error: 'Không tìm thấy chủ đề.' };
    await db.threadFollow.create({ data: { threadId, userId }, select: { id: true } });
  }

  const count = await db.threadFollow.count({ where: { threadId } });
  return { following: !existing, count };
}

/**
 * Tự theo dõi chủ đề mình vừa tham gia.
 *
 * Bỏ qua nếu người đó đã tự bỏ theo dõi trước đó? Không — chỉ dùng khi tạo
 * chủ đề hoặc trả lời, coi như hành động chủ động tham gia lại. Ai không thích
 * thì bấm bỏ theo dõi lần nữa.
 */
async function autoFollow(threadId: string, userId: string, tx: Prisma.TransactionClient) {
  await tx.threadFollow.upsert({
    where: { threadId_userId: { threadId, userId } },
    create: { threadId, userId },
    update: {},
    select: { id: true },
  });
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

// ─────────────────────────── Cảm ơn bài viết ───────────────────────────

/**
 * Cảm ơn / bỏ cảm ơn một bài trong chủ đề.
 *
 * Khác nút Thích ở chỗ danh sách người cảm ơn hiện công khai ngay dưới bài —
 * đúng nếp forum Việt ngày xưa, cảm ơn là để người ta thấy mình cảm ơn. Một
 * người vẫn vừa thích vừa cảm ơn được vì ràng buộc duy nhất có tính cả `type`.
 */
export async function toggleThanks(target: { threadId?: string; replyId?: string }): Promise<ThanksState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, people: [], count: 0, error: 'Bạn cần đăng nhập.' };

  const threadId = target.threadId ?? null;
  const replyId = target.replyId ?? null;
  if (!threadId === !replyId) return { active: false, people: [], count: 0, error: 'Thiếu thông tin bài viết.' };

  // Không cảm ơn chính mình — forum ngày xưa cũng chặn đúng chỗ này.
  const owner = threadId
    ? await db.thread.findUnique({ where: { id: threadId }, select: { authorId: true, title: true, forum: { select: { slug: true } } } })
    : await db.reply.findUnique({ where: { id: replyId! }, select: { authorId: true, threadId: true, thread: { select: { title: true, forum: { select: { slug: true } } } } } });
  if (!owner) return { active: false, people: [], count: 0, error: 'Không tìm thấy bài viết.' };
  if (owner.authorId === userId) {
    return { ...(await readThanks(target, userId)), error: 'Không cảm ơn bài của chính mình được.' };
  }

  const where = { userId, threadId, replyId, type: 'THANKS' as const };
  const existing = await db.reaction.findFirst({ where, select: { id: true } });
  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
  } else {
    await db.reaction.create({ data: where, select: { id: true } });
    const link = threadId
      ? `/forum/${(owner as { forum: { slug: string } }).forum.slug}/${threadId}`
      : `/forum/${(owner as { thread: { forum: { slug: string } } }).thread.forum.slug}/${(owner as { threadId: string }).threadId}`;
    const title = threadId
      ? (owner as { title: string }).title
      : (owner as { thread: { title: string } }).thread.title;
    await notify(
      { userId: owner.authorId, type: 'LIKE', title: 'Có người cảm ơn bài của bạn', content: title, link, actorId: userId },
    ).catch(() => {});
  }

  return readThanks(target, userId);
}

/** Đọc lại trạng thái cảm ơn của một bài. */
async function readThanks(target: { threadId?: string; replyId?: string }, userId: string | null): Promise<ThanksState> {
  const where = { threadId: target.threadId ?? null, replyId: target.replyId ?? null, type: 'THANKS' as const };
  const [rows, count, mine] = await Promise.all([
    db.reaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: THANKS_NAMES_SHOWN,
      select: { user: { select: { name: true, username: true } } },
    }),
    db.reaction.count({ where }),
    // Hỏi riêng chứ không dò trong danh sách tên: người cảm ơn từ lâu đã rơi
    // ra ngoài ngần ấy cái tên nhưng vẫn đang ở trạng thái "đã cảm ơn".
    userId ? db.reaction.count({ where: { ...where, userId } }) : Promise.resolve(0),
  ]);
  return {
    active: mine > 0,
    people: rows.map((r) => r.user.name ?? r.user.username ?? 'Ẩn danh'),
    count,
  };
}

/**
 * Tặng điểm cho bài của người khác, đi kèm nút Cảm ơn.
 *
 * Điểm chuyển thẳng từ ví người tặng sang ví tác giả, không qua trung gian và
 * nền tảng không cắt gì — tặng là tặng. Cả hai vế nằm trong một transaction:
 * không bao giờ có chuyện trừ được của người này mà không cộng cho người kia.
 */
export async function donatePoints(
  target: { threadId?: string; replyId?: string },
  amount: number,
): Promise<DonateState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  if (!Number.isInteger(amount) || amount < DONATE_MIN || amount > DONATE_MAX) {
    return { error: `Chỉ tặng được từ ${DONATE_MIN} đến ${DONATE_MAX} điểm mỗi lần.` };
  }

  const threadId = target.threadId ?? null;
  const replyId = target.replyId ?? null;
  if (!threadId === !replyId) return { error: 'Thiếu thông tin bài viết.' };

  const owner = threadId
    ? await db.thread.findUnique({ where: { id: threadId }, select: { authorId: true, title: true, forum: { select: { slug: true } } } })
    : await db.reply.findUnique({ where: { id: replyId! }, select: { authorId: true, threadId: true, thread: { select: { title: true, forum: { select: { slug: true } } } } } });
  if (!owner) return { error: 'Không tìm thấy bài viết.' };
  if (owner.authorId === userId) return { error: 'Không tặng điểm cho chính mình được.' };

  const link = threadId
    ? `/forum/${(owner as { forum: { slug: string } }).forum.slug}/${threadId}`
    : `/forum/${(owner as { thread: { forum: { slug: string } } }).thread.forum.slug}/${(owner as { threadId: string }).threadId}`;
  const title = threadId
    ? (owner as { title: string }).title
    : (owner as { thread: { title: string } }).thread.title;

  let left = 0;
  try {
    await db.$transaction(async (tx) => {
      const after = await grantPoints(
        { userId, amount: -amount, reason: 'DONATE_SENT', refId: threadId ?? replyId, note: `Tặng điểm: ${title}` },
        tx,
      );
      left = after.balance;
      await grantPoints(
        { userId: owner.authorId, amount, reason: 'DONATE_RECEIVED', refId: threadId ?? replyId, note: `Được tặng điểm: ${title}` },
        tx,
      );
      await tx.pointDonation.create({
        data: { fromId: userId, toId: owner.authorId, amount, threadId, replyId },
        select: { id: true },
      });
      // Đã bỏ công tặng thì tính luôn là đã cảm ơn — khỏi phải bấm hai lần.
      await tx.reaction
        .create({ data: { userId, threadId, replyId, type: 'THANKS' }, select: { id: true } })
        .catch(() => null);
      await notify(
        {
          userId: owner.authorId, type: 'DONATE',
          title: `Bạn được tặng ${amount} điểm`, content: title, link, actorId: userId,
        },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: 'Bạn không đủ điểm để tặng.' };
    return { error: 'Không tặng được, vui lòng thử lại.' };
  }

  const total = await db.pointDonation.aggregate({ where: { threadId, replyId }, _sum: { amount: true } });
  revalidatePath(link);
  return { ok: true, total: total._sum.amount ?? 0, left };
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

  // Hai lần bấm cùng lúc thì cả hai cùng đọc thấy "chưa có lời giải" ở trên,
  // và điểm treo thưởng bị trả HAI lần dù chỉ giữ một lần — mất điểm thật. Nên
  // chốt lời giải bằng một lần ghi CÓ ĐIỀU KIỆN: chỉ luồng nào đổi được ô đang
  // trống mới đi tiếp, luồng kia dừng lại ở đây.
  const daCoLoiGiai = await db.$transaction(async (tx) => {
    const chot = await tx.thread.updateMany({
      where: { id: threadId, solvedReplyId: null },
      data: { solvedReplyId: replyId },
    });
    if (chot.count === 0) return true;
    await tx.reply.update({ where: { id: replyId }, data: { isSolution: true } });

    // Điểm thưởng đã bị giữ từ lúc treo, giờ chỉ việc trả cho người có lời giải.
    // Tự chọn lời giải của chính mình thì hoàn lại cho chính mình.
    const bounty = thread.bountyPoints ?? 0;
    if (bounty > 0) {
      await grantPoints({
        userId: reply.authorId, amount: bounty, reason: 'BOUNTY_RECEIVED', refId: threadId,
        note: reply.authorId === userId
          ? `Hoàn điểm treo thưởng: ${thread.title}`
          : `Nhận thưởng lời giải: ${thread.title}`,
      }, tx);
    }

    if (reply.authorId !== userId) {
      await notify({
        userId: reply.authorId, type: 'SYSTEM',
        title: bounty > 0 ? `Trả lời của bạn được chọn làm lời giải (+${bounty}đ)` : 'Trả lời của bạn được chọn làm lời giải',
        content: thread.title, link: `/forum/${thread.forum.slug}/${threadId}`, actorId: userId,
      }, tx);
    }
    return false;
  });

  if (daCoLoiGiai) return { error: 'Chủ đề đã có lời giải được chọn.' };

  revalidatePath(`/forum/${thread.forum.slug}/${threadId}`);
  return { ok: true };
}

// ─────────────────────────── Công cụ điều hành ───────────────────────────

export interface ModState {
  ok?: boolean;
  error?: string;
}

/** Lấy chủ đề + kiểm tra quyền điều hành diễn đàn chứa nó. */
async function loadThreadForMod(threadId: string) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return { error: 'Bạn cần đăng nhập.' as const };

  const thread = await db.thread.findUnique({
    where: { id: threadId },
    select: { id: true, forumId: true, title: true, authorId: true, pinned: true, locked: true, featured: true, forum: { select: { slug: true } } },
  });
  if (!thread) return { error: 'Không tìm thấy chủ đề.' as const };

  const allowed = await canModerateForum({ id: user.id, role: user.role }, thread.forumId);
  if (!allowed) return { error: 'Bạn không có quyền điều hành mục này.' as const };

  return { thread, userId: user.id };
}

function revalidateThread(forumSlug: string, threadId?: string) {
  revalidatePath('/');
  revalidatePath(`/forum/${forumSlug}`);
  if (threadId) revalidatePath(`/forum/${forumSlug}/${threadId}`);
}

/** Ghim / bỏ ghim chủ đề. */
export async function toggleThreadPin(threadId: string): Promise<ModState> {
  const r = await loadThreadForMod(threadId);
  if ('error' in r) return { error: r.error };
  await db.thread.update({ where: { id: threadId }, data: { pinned: !r.thread.pinned } });
  revalidateThread(r.thread.forum.slug, threadId);
  return { ok: true };
}

/** Khoá / mở khoá trả lời. */
export async function toggleThreadLock(threadId: string): Promise<ModState> {
  const r = await loadThreadForMod(threadId);
  if ('error' in r) return { error: r.error };
  const locked = !r.thread.locked;
  await db.thread.update({ where: { id: threadId }, data: { locked } });
  if (locked && r.thread.authorId !== r.userId) {
    await notify({
      userId: r.thread.authorId, type: 'SYSTEM', title: 'Chủ đề đã bị khoá',
      content: r.thread.title, link: `/forum/${r.thread.forum.slug}/${threadId}`,
    }).catch(() => {});
  }
  revalidateThread(r.thread.forum.slug, threadId);
  return { ok: true };
}

/** Đánh dấu / bỏ đánh dấu chủ đề tinh hoa. */
export async function toggleThreadFeatured(threadId: string): Promise<ModState> {
  const r = await loadThreadForMod(threadId);
  if ('error' in r) return { error: r.error };
  await db.thread.update({ where: { id: threadId }, data: { featured: !r.thread.featured } });
  revalidateThread(r.thread.forum.slug, threadId);
  return { ok: true };
}

/** Chuyển chủ đề sang chuyên mục khác, cập nhật bộ đếm hai bên trong cùng transaction. */
export async function moveThread(threadId: string, targetForumId: string): Promise<ModState> {
  const r = await loadThreadForMod(threadId);
  if ('error' in r) return { error: r.error };
  if (targetForumId === r.thread.forumId) return { error: 'Chủ đề đã ở trong mục này.' };

  const target = await db.forum.findUnique({ where: { id: targetForumId }, select: { id: true, slug: true, name: true } });
  if (!target) return { error: 'Không tìm thấy chuyên mục đích.' };

  await db.$transaction(async (tx) => {
    await tx.thread.update({ where: { id: threadId }, data: { forumId: target.id } });
    await recountForums([r.thread.forumId, target.id], tx);
  });

  if (r.thread.authorId !== r.userId) {
    await notify({
      userId: r.thread.authorId, type: 'SYSTEM', title: 'Chủ đề đã được chuyển mục',
      content: `“${r.thread.title}” nay nằm trong ${target.name}.`, link: `/forum/${target.slug}/${threadId}`,
    }).catch(() => {});
  }

  revalidateThread(r.thread.forum.slug, threadId);
  revalidateThread(target.slug, threadId);
  return { ok: true };
}

/** Ẩn chủ đề khỏi danh sách (giữ dữ liệu để còn khôi phục được). */
export async function hideThread(threadId: string): Promise<ModState> {
  const r = await loadThreadForMod(threadId);
  if ('error' in r) return { error: r.error };

  await db.$transaction(async (tx) => {
    await tx.thread.update({ where: { id: threadId }, data: { status: 'HIDDEN' } });
    await recountForum(r.thread.forumId, tx);
  });

  if (r.thread.authorId !== r.userId) {
    await notify({
      userId: r.thread.authorId, type: 'SYSTEM', title: 'Chủ đề đã bị ẩn',
      content: r.thread.title, link: `/forum/${r.thread.forum.slug}`,
    }).catch(() => {});
  }

  revalidateThread(r.thread.forum.slug, threadId);
  redirect(`/forum/${r.thread.forum.slug}`);
}


// ─────────────────────── Quyền của chủ chủ đề ───────────────────────

export interface OwnerState {
  ok?: boolean;
  error?: string;
}

/** Xác nhận người dùng là tác giả chủ đề (hoặc là điều hành viên). */
async function assertThreadOwner(threadId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' as const };

  const thread = await db.thread.findUnique({
    where: { id: threadId },
    select: { authorId: true, forumId: true, locked: true, forum: { select: { slug: true } } },
  });
  if (!thread) return { error: 'Không tìm thấy chủ đề.' as const };

  if (thread.authorId !== userId) {
    const isMod = await canModerateForum(
      { id: userId, role: (session.user as { role?: string }).role },
      thread.forumId,
    );
    if (!isMod) return { error: 'Bạn không có quyền với chủ đề này.' as const };
  }
  return { userId, thread };
}

/** Chủ đề chỉ sửa được khi chưa bị khoá. */
export async function updateThread(_prev: ThreadState, formData: FormData): Promise<ThreadState> {
  const threadId = String(formData.get('threadId') ?? '');
  const guard = await assertThreadOwner(threadId);
  if ('error' in guard) return { error: guard.error };
  if (guard.thread.locked) return { error: 'Chủ đề đã bị khoá, không thể sửa.' };

  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (title.length < 5) return { error: 'Tiêu đề tối thiểu 5 ký tự.' };
  if (title.length > 200) return { error: 'Tiêu đề tối đa 200 ký tự.' };
  if (content.length < 10) return { error: 'Nội dung quá ngắn (tối thiểu 10 ký tự).' };

  await db.thread.update({
    where: { id: threadId },
    data: { title, content: bbcodeToHtml(content), contentSource: content },
    select: { id: true },
  });

  const path = `/forum/${guard.thread.forum.slug}/${threadId}`;
  revalidatePath(path);
  redirect(path);
}

/** Chủ đề tự khoá / mở lại chủ đề của mình. */
export async function toggleOwnThreadLock(threadId: string): Promise<OwnerState> {
  const guard = await assertThreadOwner(threadId);
  if ('error' in guard) return { error: guard.error };

  await db.thread.update({
    where: { id: threadId },
    data: { locked: !guard.thread.locked },
    select: { id: true },
  });
  revalidatePath(`/forum/${guard.thread.forum.slug}/${threadId}`);
  return { ok: true };
}

/** Xoá chủ đề của mình, đồng bộ lại bộ đếm của chuyên mục. */
export async function deleteOwnThread(threadId: string): Promise<OwnerState> {
  const guard = await assertThreadOwner(threadId);
  if ('error' in guard) return { error: guard.error };
  const slug = guard.thread.forum.slug;

  const info = await db.thread.findUnique({
    where: { id: threadId },
    select: { authorId: true, title: true, bountyPoints: true, solvedReplyId: true },
  });

  await db.$transaction(async (tx) => {
    // Xoá chủ đề khi chưa chọn lời giải thì hoàn lại điểm đang bị giữ.
    if (info?.bountyPoints && !info.solvedReplyId) {
      await grantPoints({
        userId: info.authorId, amount: info.bountyPoints, reason: 'BOUNTY_RECEIVED', refId: threadId,
        note: `Hoàn điểm treo thưởng (xoá chủ đề): ${info.title}`,
      }, tx);
    }

    await tx.thread.delete({ where: { id: threadId } });
    await recountForum(guard.thread.forumId, tx);
  });

  revalidatePath(`/forum/${slug}`);
  redirect(`/forum/${slug}`);
}

// ─────────────────────────── Bình chọn ───────────────────────────

export interface PollState {
  ok?: boolean;
  error?: string;
}

/**
 * Bỏ phiếu cho một hoặc nhiều lựa chọn.
 *
 * Ghi lại toàn bộ lựa chọn hiện tại thay vì cộng dồn: bấm lại là đổi ý, và
 * bình chọn một đáp án thì phiếu cũ tự bị thay.
 */
export async function votePoll(pollId: string, optionIds: string[]): Promise<PollState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để bình chọn.' };

  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'bình chọn') };

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true, multiple: true, closed: true, closesAt: true,
      options: { select: { id: true } },
      thread: { select: { id: true, forum: { select: { slug: true } } } },
    },
  });
  if (!poll) return { error: 'Không tìm thấy cuộc bình chọn.' };
  if (isPollClosed(poll)) return { error: 'Cuộc bình chọn đã kết thúc.' };

  // Chỉ nhận lựa chọn thuộc đúng cuộc bình chọn này.
  const valid = new Set(poll.options.map((o) => o.id));
  const picked = [...new Set(optionIds)].filter((id) => valid.has(id));
  if (picked.length === 0) return { error: 'Hãy chọn ít nhất một đáp án.' };
  if (!poll.multiple && picked.length > 1) return { error: 'Cuộc bình chọn này chỉ cho chọn một đáp án.' };

  await db.$transaction(async (tx) => {
    await tx.pollVote.deleteMany({ where: { pollId, userId } });
    await tx.pollVote.createMany({ data: picked.map((optionId) => ({ pollId, optionId, userId })) });
  });

  revalidatePath(`/forum/${poll.thread.forum.slug}/${poll.thread.id}`);
  return { ok: true };
}

/** Chủ chủ đề hoặc người kiểm duyệt đóng bình chọn sớm. */
export async function closePoll(pollId: string): Promise<PollState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: { id: true, thread: { select: { id: true, authorId: true, forumId: true, forum: { select: { slug: true } } } } },
  });
  if (!poll) return { error: 'Không tìm thấy cuộc bình chọn.' };

  const isOwner = poll.thread.authorId === userId;
  const me = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!isOwner && !(await canModerateForum(me, poll.thread.forumId))) {
    return { error: 'Bạn không có quyền đóng cuộc bình chọn này.' };
  }

  await db.poll.update({ where: { id: pollId }, data: { closed: true }, select: { id: true } });
  revalidatePath(`/forum/${poll.thread.forum.slug}/${poll.thread.id}`);
  return { ok: true };
}

// ─────────────────────────── Ẩn trả lời ───────────────────────────

export interface HideState {
  hidden?: boolean;
  error?: string;
}

/**
 * Ẩn hoặc hiện lại một trả lời.
 *
 * Ẩn chứ không xoá: nội dung còn đó để đối chiếu khi có khiếu nại, và các
 * phản hồi lồng bên dưới không bị kéo theo. Số đếm trả lời phải chỉnh theo,
 * không thì chủ đề khoe nhiều trả lời hơn số thật sự đọc được.
 */
export async function toggleReplyHidden(replyId: string): Promise<HideState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const reply = await db.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true, hidden: true, threadId: true,
      thread: { select: { forumId: true, forum: { select: { slug: true } } } },
    },
  });
  if (!reply) return { error: 'Không tìm thấy trả lời.' };

  const me = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!(await canModerateForum(me, reply.thread.forumId))) {
    return { error: 'Bạn không có quyền kiểm duyệt ở diễn đàn này.' };
  }

  const hidden = !reply.hidden;
  await db.$transaction(async (tx) => {
    await tx.reply.update({ where: { id: replyId }, data: { hidden }, select: { id: true } });
    await recountThread(reply.threadId, tx);
    await recountForum(reply.thread.forumId, tx);
  });

  revalidatePath(`/forum/${reply.thread.forum.slug}/${reply.threadId}`);
  return { hidden };
}

// ─────────────────────────── Lưu chủ đề ───────────────────────────

export interface FavoriteState {
  saved: boolean;
  count: number;
  error?: string;
}

/** Lưu chủ đề vào mục "Đã lưu" để đọc lại sau. */
export async function toggleThreadFavorite(threadId: string): Promise<FavoriteState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { saved: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const existing = await db.favorite.findUnique({
    where: { userId_threadId: { userId, threadId } }, select: { id: true },
  });
  if (existing) await db.favorite.delete({ where: { id: existing.id } });
  else {
    const thread = await db.thread.findUnique({ where: { id: threadId }, select: { id: true } });
    if (!thread) return { saved: false, count: 0, error: 'Không tìm thấy chủ đề.' };
    await db.favorite.create({ data: { userId, threadId }, select: { id: true } });
  }

  const count = await db.favorite.count({ where: { threadId } });
  return { saved: !existing, count };
}

// ─────────────────── Sửa / xoá trả lời của chính mình ───────────────────

export interface ReplyEditState {
  ok?: boolean;
  error?: string;
}

/**
 * Chỉ tác giả mới sửa/xoá được trả lời của mình.
 *
 * Người kiểm duyệt cố tình không nằm trong diện này: họ đã có nút "Ẩn", giữ
 * nguyên nội dung để còn đối chiếu khi có khiếu nại — sửa lời người khác hay
 * xoá hẳn thì mất dấu vết.
 */
async function assertReplyOwner(replyId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' as const };

  const reply = await db.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true, authorId: true, isSolution: true, threadId: true,
      thread: { select: { locked: true, forumId: true, forum: { select: { slug: true } } } },
    },
  });
  if (!reply) return { error: 'Không tìm thấy trả lời.' as const };
  if (reply.authorId !== userId) return { error: 'Bạn chỉ sửa được trả lời của mình.' as const };
  if (reply.thread.locked) return { error: 'Chủ đề đã bị khoá, không sửa được trả lời.' as const };

  return { userId, reply };
}

/**
 * Sửa nội dung trả lời.
 *
 * Không gửi lại thông báo nhắc tên cho những @tên mới thêm vào: sửa bài để
 * chèn tên người khác là đường vòng để làm phiền, mà bản gốc đã báo một lần rồi.
 */
export async function updateReply(_prev: ReplyEditState, formData: FormData): Promise<ReplyEditState> {
  const replyId = String(formData.get('replyId') ?? '');
  const guard = await assertReplyOwner(replyId);
  if ('error' in guard) return { error: guard.error };

  const content = String(formData.get('content') ?? '').trim();
  if (content.length < 2) return { error: 'Nội dung trả lời quá ngắn.' };
  if (content.length > 5000) return { error: 'Trả lời tối đa 5000 ký tự.' };

  await db.reply.update({ where: { id: replyId }, data: { content }, select: { id: true } });

  revalidatePath(`/forum/${guard.reply.thread.forum.slug}/${guard.reply.threadId}`);
  return { ok: true };
}

/**
 * Xoá hẳn trả lời của mình, kèm các phản hồi lồng bên dưới (khoá ngoại tự dọn).
 *
 * Bộ đếm được đếm lại từ dữ liệu thật sau khi xoá (xem `forum-counters.ts`),
 * nên không phải tự tính xem bài này đã bị trừ lúc ẩn hay chưa.
 *
 * Điểm thưởng lúc trả lời không thu lại — giống xoá chủ đề, để người dùng khỏi
 * bị âm điểm vì dọn bài cũ.
 */
export async function deleteOwnReply(replyId: string): Promise<ReplyEditState> {
  const guard = await assertReplyOwner(replyId);
  if ('error' in guard) return { error: guard.error };
  const { reply } = guard;

  // Lời giải đã chốt thì không cho xoá: điểm treo thưởng đã trả, xoá đi là chủ
  // đề mang nhãn "đã giải quyết" mà chẳng còn câu trả lời nào.
  if (reply.isSolution) return { error: 'Trả lời đã được chọn làm lời giải, không xoá được.' };

  // Đếm bằng count chứ không kéo cả danh sách phản hồi về: một trả lời có
  // hàng nghìn phản hồi thì đọc hết chỉ để đếm là tự dựng một quả bom.
  const solutionBelow = await db.reply.count({ where: { parentId: replyId, isSolution: true } });
  if (solutionBelow > 0) {
    return { error: 'Có phản hồi bên dưới đang là lời giải, không xoá được.' };
  }

  await db.$transaction(async (tx) => {
    await tx.reply.delete({ where: { id: replyId } });
    await recountThread(reply.threadId, tx);
    await recountForum(reply.thread.forumId, tx);
  });

  revalidatePath(`/forum/${reply.thread.forum.slug}/${reply.threadId}`);
  return { ok: true };
}

// ─────────────────────────── Dấu bài mới ───────────────────────────

export interface ReadAllState {
  ok?: boolean;
  error?: string;
}

/** "Đánh dấu đã đọc hết" — xoá sạch dấu chủ đề mới cho người đang đăng nhập. */
export async function markAllForumsRead(): Promise<ReadAllState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  await markAllThreadsRead(userId);
  // Danh sách chủ đề dựng lại theo yêu cầu nên chỉ cần bảo Next bỏ bản cũ;
  // trang chủ cũng có bảng chủ đề mới nhất nên làm mới luôn.
  revalidatePath('/');
  revalidatePath('/forum', 'layout');
  revalidatePath('/chua-doc');
  return { ok: true };
}

// ───────────────────── Mở khối [hide=diem:N] bằng điểm ─────────────────────

export interface HideUnlockState {
  ok?: boolean;
  error?: string;
}

/**
 * Trả điểm để mở phần ẩn của một chủ đề.
 *
 * Giá lấy từ chính nội dung bài — người đăng gõ `[hide=diem:50]` — nên phải đọc
 * lại bài ở máy chủ mà chấm, không tin số do trình duyệt gửi lên. Nhiều khối
 * ẩn trong một bài thì lấy khối đắt nhất: trả một lần mở hết, khỏi phải giải
 * thích vì sao mở được khối này mà khối kia vẫn khoá.
 *
 * Trừ điểm, chia cho người đăng và ghi sổ quyền trong cùng một transaction;
 * ràng buộc duy nhất (userId, threadId) lo phần bấm hai lần.
 */
export async function unlockThreadHide(threadId: string): Promise<HideUnlockState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để mở khoá.' };

  const thread = await db.thread.findUnique({
    where: { id: threadId },
    select: { id: true, title: true, authorId: true, content: true, forum: { select: { slug: true } } },
  });
  if (!thread) return { error: 'Không tìm thấy chủ đề.' };
  if (thread.authorId === userId) return { ok: true };

  const price = Math.max(
    0,
    ...hideRules(thread.content).map((r) => (r.kind === 'POINTS' ? r.n : 0)),
  );
  if (price <= 0) return { error: 'Phần ẩn của chủ đề này không mở bằng điểm.' };

  const already = await db.threadHideUnlock.findUnique({
    where: { userId_threadId: { userId, threadId } }, select: { id: true },
  });
  if (already) return { ok: true };

  const share = authorShareOf(price);
  try {
    await db.$transaction(async (tx) => {
      await grantPoints(
        { userId, amount: -price, reason: 'PURCHASE_CONTENT', refId: threadId, note: `Mở nội dung ẩn: ${thread.title}` },
        tx,
      );
      if (share > 0) {
        await grantPoints(
          { userId: thread.authorId, amount: share, reason: 'CONTENT_SALE', refId: threadId, note: `Có người mở nội dung ẩn: ${thread.title}` },
          tx,
        );
      }
      await tx.threadHideUnlock.create({
        data: { userId, threadId, pointsPaid: price }, select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Bạn không đủ ${price} điểm để mở khoá.` };
    // Hai tab bấm cùng lúc: ràng buộc duy nhất chặn bản ghi thứ hai, coi như xong.
    const owned = await db.threadHideUnlock.findUnique({
      where: { userId_threadId: { userId, threadId } }, select: { id: true },
    });
    if (owned) return { ok: true };
    return { error: 'Không mở khoá được, vui lòng thử lại.' };
  }

  revalidatePath(`/forum/${thread.forum.slug}/${threadId}`);
  return { ok: true };
}
