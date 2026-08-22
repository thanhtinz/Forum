'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';
import { grantBalance } from '@/lib/balance';
import { checkAndAwardMedals, MEDAL_CONDITIONS } from '@/lib/medals';
import { GIF_SETTING_KEY } from '@/lib/gif';
import { R2_SETTING_KEY, deleteFile } from '@/lib/storage';
import { normalizeIcon, isPublicImageRef } from '@/lib/icon';
import { NAV_GROUPS, NAV_DEFAULTS, isSafeNavUrl } from '@/lib/nav';
import { SITE_SETTING_KEY } from '@/lib/site';

// ─────────────── Bài viết ───────────────

export async function approvePost(id: string) {
  await requireAdmin();
  const post = await db.post.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() }, select: { authorId: true, slug: true, title: true } });
  await notify({ userId: post.authorId, type: 'SYSTEM', title: 'Bài viết đã được duyệt', content: post.title, link: `/posts/${post.slug}` });
  await checkAndAwardMedals(post.authorId).catch(() => {});
  revalidatePath('/admin/posts');
}

export async function setPostStatus(id: string, status: 'PUBLISHED' | 'PENDING' | 'ARCHIVED') {
  await requireAdmin();
  await db.post.update({ where: { id }, data: { status, ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}) } });
  revalidatePath('/admin/posts');
}

export async function deletePost(id: string) {
  await requireAdmin();
  await db.post.delete({ where: { id } });
  revalidatePath('/admin/posts');
}

export async function togglePostFeatured(id: string) {
  await requireAdmin();
  const p = await db.post.findUnique({ where: { id }, select: { featured: true } });
  await db.post.update({ where: { id }, data: { featured: !p?.featured } });
  revalidatePath('/admin/posts');
}

// ─────────────── Người dùng ───────────────

export async function setUserRole(id: string, role: 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN') {
  await requireSuperAdmin();
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath('/admin/users');
}

export async function toggleBan(id: string) {
  const admin = await requireAdmin();
  const u = await db.user.findUnique({ where: { id }, select: { status: true, role: true } });
  if (!u || u.role === 'ADMIN') return; // không khoá admin
  const banned = u.status === 'BANNED';
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status: banned ? 'ACTIVE' : 'BANNED' } });
    if (!banned) await tx.ban.create({ data: { userId: id, reason: 'Khoá bởi quản trị', createdBy: admin.id } });
  });
  revalidatePath('/admin/users');
}

// ─────────────── Chuyên mục ───────────────

function slugify(s: string, fallback = 'muc'): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || fallback;
}

export type CategoryState = { ok?: boolean; error?: string };

export async function saveCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const parentId = String(formData.get('parentId') ?? '').trim() || null;
  const color = String(formData.get('color') ?? '').trim() || null;
  const icon = normalizeIcon(formData.get('icon'));
  const description = String(formData.get('description') ?? '').trim() || null;
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;
  if (name.length < 2) return { error: 'Tên chuyên mục quá ngắn.' };
  if (parentId && parentId === id) return { error: 'Chuyên mục không thể là cha của chính nó.' };

  try {
    if (id) {
      await db.category.update({ where: { id }, data: { name, parentId, color, icon, description, order } });
    } else {
      let slug = slugify(name);
      if (await db.category.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString().slice(-4)}`;
      await db.category.create({ data: { slug, name, parentId, color, icon, description, order } });
    }
  } catch {
    return { error: 'Không thể lưu chuyên mục.' };
  }
  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await db.category.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/categories');
  revalidatePath('/');
}

// ─────────────── Gói VIP ───────────────

export async function updateVipPlan(id: string, data: {
  name: string; description: string | null; icon: string | null; color: string | null;
  price: number; originalPrice: number | null; durationDays: number | null;
  discountPercent: number; freeContent: boolean; active: boolean;
}) {
  await requireAdmin();
  const name = data.name.trim();
  if (name.length < 2) return { error: 'Tên gói quá ngắn.' };
  await db.vipPlan.update({
    where: { id },
    data: {
      ...data,
      name,
      description: data.description?.trim() || null,
      icon: normalizeIcon(data.icon),
      color: data.color?.trim() || null,
    },
  });
  revalidatePath('/admin/vip-plans');
  revalidatePath('/vip');
  return { ok: true };
}

// ─────────────── Cấu hình GIF ───────────────

export type GifSettingState = { ok?: boolean; error?: string };

export async function saveGifConfig(_prev: GifSettingState, formData: FormData): Promise<GifSettingState> {
  await requireAdmin();
  const provider = String(formData.get('provider') ?? 'tenor') === 'giphy' ? 'giphy' : 'tenor';
  const apiKey = String(formData.get('apiKey') ?? '').trim();
  const enabled = formData.get('enabled') === 'on';

  if (enabled && !apiKey) return { error: 'Hãy nhập khoá API trước khi bật.' };

  await db.siteSetting.upsert({
    where: { key: GIF_SETTING_KEY },
    update: { value: { provider, apiKey, enabled } },
    create: { key: GIF_SETTING_KEY, value: { provider, apiKey, enabled } },
  });
  revalidatePath('/admin/gif');
  return { ok: true };
}

// ─────────────── Lưu trữ Cloudflare R2 ───────────────

export type R2State = { ok?: boolean; error?: string };

export async function saveR2Config(_prev: R2State, formData: FormData): Promise<R2State> {
  await requireSuperAdmin();
  const accountId = String(formData.get('accountId') ?? '').trim();
  const accessKeyId = String(formData.get('accessKeyId') ?? '').trim();
  const secretAccessKey = String(formData.get('secretAccessKey') ?? '').trim();
  const bucket = String(formData.get('bucket') ?? '').trim();
  const publicUrl = String(formData.get('publicUrl') ?? '').trim().replace(/\/$/, '');
  const enabled = formData.get('enabled') === 'on';

  const prev = ((await db.siteSetting.findUnique({ where: { key: R2_SETTING_KEY } }))?.value ?? {}) as Record<string, string>;
  // Để trống khoá bí mật nghĩa là giữ nguyên khoá đang lưu
  const secret = secretAccessKey || prev.secretAccessKey || '';

  if (enabled && !(accountId && accessKeyId && secret && bucket && publicUrl)) {
    return { error: 'Hãy điền đủ Account ID, Access Key, Secret, Bucket và địa chỉ công khai trước khi bật.' };
  }
  if (publicUrl && !/^https?:\/\//.test(publicUrl)) {
    return { error: 'Địa chỉ công khai phải bắt đầu bằng http:// hoặc https://' };
  }

  const value = { accountId, accessKeyId, secretAccessKey: secret, bucket, publicUrl, enabled };
  await db.siteSetting.upsert({
    where: { key: R2_SETTING_KEY },
    update: { value },
    create: { key: R2_SETTING_KEY, value },
  });
  revalidatePath('/admin/storage');
  return { ok: true };
}

// ─────────────── Bộ sticker ───────────────

export async function deleteStickerPack(id: string) {
  await requireSuperAdmin();
  const pack = await db.stickerPack.findUnique({
    where: { id },
    select: { stickers: { select: { storageKey: true } } },
  });
  for (const s of pack?.stickers ?? []) await deleteFile(s.storageKey ?? '');
  await db.stickerPack.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/stickers');
}

export async function toggleStickerPack(id: string) {
  await requireSuperAdmin();
  const p = await db.stickerPack.findUnique({ where: { id }, select: { active: true } });
  await db.stickerPack.update({ where: { id }, data: { active: !p?.active }, select: { id: true } });
  revalidatePath('/admin/stickers');
}

// ─────────────── Báo cáo ───────────────

export async function setReportStatus(id: string, status: 'RESOLVED' | 'DISMISSED') {
  await requireAdmin();
  await db.report.update({ where: { id }, data: { status, handledAt: new Date() } });
  revalidatePath('/admin/reports');
}

/** Duyệt báo cáo và ẩn/xoá nội dung bị báo cáo cùng lúc. */
export async function resolveReportAndRemove(id: string) {
  await requireAdmin();
  const r = await db.report.findUnique({ where: { id }, select: { postId: true, threadId: true, replyId: true, commentId: true } });
  if (!r) return;
  await db.$transaction(async (tx) => {
    if (r.postId) await tx.post.update({ where: { id: r.postId }, data: { status: 'ARCHIVED' } }).catch(() => {});
    if (r.threadId) await tx.thread.delete({ where: { id: r.threadId } }).catch(() => {});
    if (r.replyId) await tx.reply.delete({ where: { id: r.replyId } }).catch(() => {});
    if (r.commentId) await tx.comment.delete({ where: { id: r.commentId } }).catch(() => {});
    await tx.report.update({ where: { id }, data: { status: 'RESOLVED', handledAt: new Date() } });
  });
  revalidatePath('/admin/reports');
}

// ─────────────── Rút tiền ───────────────

export async function setWithdrawalStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PAID') {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    const w = await tx.withdrawal.findUnique({ where: { id }, select: { userId: true, amount: true, status: true } });
    if (!w || w.status === 'PAID' || w.status === 'REJECTED') return; // đã xử lý xong

    await tx.withdrawal.update({ where: { id }, data: { status, processedAt: new Date() } });

    if (status === 'REJECTED') {
      // Hoàn tiền đang đóng băng về số dư khả dụng
      await tx.user.update({ where: { id: w.userId }, data: { frozenBalance: { decrement: w.amount } } });
      await grantBalance({ userId: w.userId, amount: w.amount, reason: 'REFUND', refId: id, note: 'Hoàn tiền yêu cầu rút bị từ chối' }, tx);
      await notify({ userId: w.userId, type: 'SYSTEM', title: 'Yêu cầu rút tiền bị từ chối', content: `Số tiền ${w.amount.toLocaleString('vi-VN')}₫ đã được hoàn về số dư.`, link: '/user/balance' }, tx);
    } else if (status === 'PAID') {
      // Tiền đã chuyển đi: trừ khỏi đóng băng (đã ghi log WITHDRAW khi tạo yêu cầu)
      await tx.user.update({ where: { id: w.userId }, data: { frozenBalance: { decrement: w.amount } } });
      await notify({ userId: w.userId, type: 'SYSTEM', title: 'Rút tiền thành công', content: `Đã chuyển ${w.amount.toLocaleString('vi-VN')}₫ tới tài khoản của bạn.`, link: '/user/balance' }, tx);
    } else if (status === 'APPROVED') {
      await notify({ userId: w.userId, type: 'SYSTEM', title: 'Yêu cầu rút tiền đã được duyệt', content: 'Chúng tôi sẽ chuyển khoản trong thời gian sớm nhất.', link: '/user/balance' }, tx);
    }
  });
  revalidatePath('/admin/withdrawals');
}

// ─────────────── Đơn hàng ───────────────

/**
 * Xác nhận đơn nạp tiền thủ công khi webhook SePay không về.
 * Dùng lại đúng luồng của webhook: đổi trạng thái + cộng số dư trong một transaction,
 * và chỉ chạy khi đơn còn PENDING nên bấm hai lần không cộng tiền hai lần.
 */
export async function markOrderPaid(id: string) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      select: { id: true, code: true, userId: true, status: true, type: true, amount: true, finalAmount: true },
    });
    if (!order || order.status !== 'PENDING') return;

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date(), payMethod: 'ADMIN' },
      select: { id: true },
    });

    if (order.type === 'TOPUP') {
      const amount = order.finalAmount || order.amount;
      await grantBalance({ userId: order.userId, amount, reason: 'TOPUP', refId: order.id, note: `Nạp tiền — ${order.code} (admin xác nhận)` }, tx);
      await notify({
        userId: order.userId, type: 'ORDER',
        title: `Nạp tiền thành công +${amount.toLocaleString('vi-VN')}₫`,
        content: order.code, link: '/user/balance',
      }, tx);
    } else {
      await notify({ userId: order.userId, type: 'ORDER', title: 'Đơn hàng đã được xác nhận', content: order.code, link: '/user/orders' }, tx);
    }
  });
  revalidatePath('/admin/orders');
}

export async function cancelOrder(id: string) {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id }, select: { status: true, code: true, userId: true } });
  if (!order || order.status !== 'PENDING') return; // đơn đã trả tiền thì không huỷ suông được
  await db.order.update({ where: { id }, data: { status: 'CANCELLED' }, select: { id: true } });
  await notify({ userId: order.userId, type: 'ORDER', title: 'Đơn hàng đã bị huỷ', content: order.code, link: '/user/orders' });
  revalidatePath('/admin/orders');
}

// ─────────────── Chủ đề diễn đàn ───────────────

export async function setThreadStatus(id: string, status: 'PUBLISHED' | 'PENDING' | 'HIDDEN') {
  await requireAdmin();
  await db.thread.update({ where: { id }, data: { status }, select: { id: true } });
  revalidatePath('/admin/threads');
}

export async function toggleThreadPinned(id: string) {
  await requireAdmin();
  const t = await db.thread.findUnique({ where: { id }, select: { pinned: true } });
  await db.thread.update({ where: { id }, data: { pinned: !t?.pinned }, select: { id: true } });
  revalidatePath('/admin/threads');
}

export async function toggleThreadLocked(id: string) {
  await requireAdmin();
  const t = await db.thread.findUnique({ where: { id }, select: { locked: true } });
  await db.thread.update({ where: { id }, data: { locked: !t?.locked }, select: { id: true } });
  revalidatePath('/admin/threads');
}

export async function deleteThread(id: string) {
  await requireAdmin();
  const t = await db.thread.findUnique({ where: { id }, select: { forumId: true } });
  if (!t) return;
  await db.$transaction(async (tx) => {
    await tx.thread.delete({ where: { id } });
    // Đếm lại cho khu vực để số chủ đề không lệch.
    const count = await tx.thread.count({ where: { forumId: t.forumId } });
    await tx.forum.update({ where: { id: t.forumId }, data: { threadCount: count }, select: { id: true } });
  });
  revalidatePath('/admin/threads');
}

// ─────────────── Diễn đàn ───────────────

export type ForumState = { ok?: boolean; error?: string };

const FORUM_ACCESS = ['ALL', 'MEMBERS', 'VIP', 'MODERATORS'] as const;
type ForumAccessValue = (typeof FORUM_ACCESS)[number];

function parseForumAccess(raw: unknown): ForumAccessValue {
  const v = String(raw ?? 'ALL');
  return (FORUM_ACCESS as readonly string[]).includes(v) ? (v as ForumAccessValue) : 'ALL';
}

export async function saveForum(_prev: ForumState, formData: FormData): Promise<ForumState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const parentId = String(formData.get('parentId') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const icon = normalizeIcon(formData.get('icon'));
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;
  const postAccess = parseForumAccess(formData.get('postAccess'));
  const minLevel = Math.max(1, parseInt(String(formData.get('minLevel') ?? '1'), 10) || 1);
  const vipOnly = formData.get('vipOnly') === 'on';

  if (name.length < 2) return { error: 'Tên diễn đàn quá ngắn.' };
  if (parentId && parentId === id) return { error: 'Diễn đàn không thể là cha của chính nó.' };

  try {
    if (id) {
      await db.forum.update({ where: { id }, data: { name, parentId, description, icon, order, postAccess, minLevel, vipOnly } });
    } else {
      let slug = slugify(name, 'dien-dan');
      if (await db.forum.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString().slice(-4)}`;
      await db.forum.create({ data: { slug, name, parentId, description, icon, order, postAccess, minLevel, vipOnly } });
    }
  } catch {
    return { error: 'Không thể lưu diễn đàn.' };
  }
  revalidatePath('/admin/forums');
  revalidatePath('/forum');
  return { ok: true };
}

export async function deleteForum(id: string) {
  await requireAdmin();
  const forum = await db.forum.findUnique({ where: { id }, select: { threadCount: true } });
  if (!forum) return;
  if (forum.threadCount > 0) return; // còn chủ đề thì không xoá, tránh mất dữ liệu
  await db.forum.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/forums');
  revalidatePath('/forum');
}

// ─────────────── Giao diện: slide & liên kết bạn bè ───────────────

export type AppearanceState = { ok?: boolean; error?: string };

export async function saveSlide(_prev: AppearanceState, formData: FormData): Promise<AppearanceState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const title = String(formData.get('title') ?? '').trim();
  const subtitle = String(formData.get('subtitle') ?? '').trim() || null;
  const image = String(formData.get('image') ?? '').trim();
  const link = String(formData.get('link') ?? '').trim() || null;
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;
  const active = formData.get('active') === 'on';

  if (title.length < 2) return { error: 'Tiêu đề slide quá ngắn.' };
  if (!image) return { error: 'Cần có ảnh nền cho slide.' };

  const data = { title, subtitle, image, link, order, active };
  try {
    if (id) await db.slide.update({ where: { id }, data });
    else await db.slide.create({ data });
  } catch {
    return { error: 'Không thể lưu slide.' };
  }
  revalidatePath('/admin/slides');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteSlide(id: string) {
  await requireAdmin();
  await db.slide.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/slides');
  revalidatePath('/');
}

export async function toggleSlide(id: string) {
  await requireAdmin();
  const s = await db.slide.findUnique({ where: { id }, select: { active: true } });
  if (!s) return;
  await db.slide.update({ where: { id }, data: { active: !s.active } });
  revalidatePath('/admin/slides');
  revalidatePath('/');
}

export async function saveFriendLink(_prev: AppearanceState, formData: FormData): Promise<AppearanceState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const logo = String(formData.get('logo') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;
  const active = formData.get('active') === 'on';

  if (name.length < 2) return { error: 'Tên liên kết quá ngắn.' };
  if (!/^https?:\/\//i.test(url)) return { error: 'Địa chỉ phải bắt đầu bằng http:// hoặc https://' };

  const data = { name, url, logo, description, order, active };
  try {
    if (id) await db.friendLink.update({ where: { id }, data });
    else await db.friendLink.create({ data });
  } catch {
    return { error: 'Không thể lưu liên kết.' };
  }
  revalidatePath('/admin/links');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteFriendLink(id: string) {
  await requireAdmin();
  await db.friendLink.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/links');
  revalidatePath('/');
}

export async function toggleFriendLink(id: string) {
  await requireAdmin();
  const l = await db.friendLink.findUnique({ where: { id }, select: { active: true } });
  if (!l) return;
  await db.friendLink.update({ where: { id }, data: { active: !l.active } });
  revalidatePath('/admin/links');
  revalidatePath('/');
}

// ─────────────── Mã giảm giá ───────────────

export type CouponState = { ok?: boolean; error?: string };

/** Chuỗi từ input type="datetime-local" → Date, rỗng thì null. */
function parseDate(raw: FormDataEntryValue | null): Date | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIntOrNull(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

export async function saveCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? 'FIXED') === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const value = parseInt(String(formData.get('value') ?? '0'), 10) || 0;
  const minAmount = parseIntOrNull(formData.get('minAmount'));
  const maxDiscount = parseIntOrNull(formData.get('maxDiscount'));
  const appliesToRaw = String(formData.get('appliesTo') ?? '').trim();
  const appliesTo = ['CONTENT', 'VIP', 'TOPUP', 'POINTS'].includes(appliesToRaw)
    ? (appliesToRaw as 'CONTENT' | 'VIP' | 'TOPUP' | 'POINTS')
    : null;
  const totalQuantity = parseIntOrNull(formData.get('totalQuantity'));
  const perUserLimit = Math.max(1, parseInt(String(formData.get('perUserLimit') ?? '1'), 10) || 1);
  const startsAt = parseDate(formData.get('startsAt'));
  const endsAt = parseDate(formData.get('endsAt'));
  const active = formData.get('active') === 'on';

  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { error: 'Mã chỉ gồm chữ hoa, số, gạch ngang — dài 3–24 ký tự.' };
  if (name.length < 2) return { error: 'Tên chương trình quá ngắn.' };
  if (value <= 0) return { error: 'Giá trị giảm phải lớn hơn 0.' };
  if (type === 'PERCENT' && value > 100) return { error: 'Giảm theo phần trăm không vượt quá 100.' };
  if (startsAt && endsAt && startsAt >= endsAt) return { error: 'Ngày kết thúc phải sau ngày bắt đầu.' };

  const data = { code, name, type, value, minAmount, maxDiscount, appliesTo, totalQuantity, perUserLimit, startsAt, endsAt, active } as const;
  try {
    if (id) await db.coupon.update({ where: { id }, data });
    else await db.coupon.create({ data });
  } catch {
    return { error: 'Không thể lưu — có thể mã đã tồn tại.' };
  }
  revalidatePath('/admin/coupons');
  return { ok: true };
}

export async function toggleCoupon(id: string) {
  await requireAdmin();
  const c = await db.coupon.findUnique({ where: { id }, select: { active: true } });
  if (!c) return;
  await db.coupon.update({ where: { id }, data: { active: !c.active } });
  revalidatePath('/admin/coupons');
}

/** Chỉ xoá được mã chưa ai dùng — đã dùng thì tắt để giữ lịch sử đơn hàng. */
export async function deleteCoupon(id: string) {
  await requireAdmin();
  const used = await db.couponClaim.count({ where: { couponId: id } });
  if (used > 0) return;
  await db.coupon.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/coupons');
}

// ─────────────── Huy chương ───────────────

export type MedalState = { ok?: boolean; error?: string };

export async function saveMedal(_prev: MedalState, formData: FormData): Promise<MedalState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const icon = normalizeIcon(formData.get('icon')) ?? '';
  const description = String(formData.get('description') ?? '').trim() || null;
  const color = String(formData.get('color') ?? '').trim() || null;
  const rarity = Math.min(5, Math.max(1, parseInt(String(formData.get('rarity') ?? '1'), 10) || 1));
  const conditionType = String(formData.get('conditionType') ?? '').trim() || null;
  const conditionValue = parseInt(String(formData.get('conditionValue') ?? ''), 10);

  if (name.length < 2) return { error: 'Tên huy chương quá ngắn.' };
  if (!icon) return { error: 'Hãy nhập biểu tượng (emoji) hoặc tải ảnh lên.' };
  if (conditionType && !MEDAL_CONDITIONS.some((c) => c.value === conditionType)) {
    return { error: 'Điều kiện không hợp lệ.' };
  }
  // Trao tự động mà thiếu mốc thì huy chương sẽ không bao giờ được trao.
  if (conditionType && !(conditionValue > 0)) return { error: 'Hãy nhập mốc đạt được lớn hơn 0.' };

  const autoGrant = Boolean(conditionType);
  const data = {
    name, icon, description, color, rarity,
    conditionType, conditionValue: conditionType ? conditionValue : null, autoGrant,
  };

  try {
    if (id) {
      await db.medal.update({ where: { id }, data, select: { id: true } });
    } else {
      let slug = slugify(name, 'huy-chuong');
      if (await db.medal.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString().slice(-4)}`;
      await db.medal.create({ data: { ...data, slug }, select: { id: true } });
    }
  } catch {
    return { error: 'Không lưu được huy chương.' };
  }
  revalidatePath('/admin/medals');
  return { ok: true };
}

export async function deleteMedal(id: string) {
  await requireAdmin();
  // Xoá huy chương thì bộ sưu tập của thành viên cũng mất, nên chặn khi đã có người nhận.
  const owned = await db.userMedal.count({ where: { medalId: id } });
  if (owned > 0) return;
  await db.medal.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/medals');
}

// ─────────────── Cấp độ ───────────────

export type LevelState = { ok?: boolean; error?: string };

export async function saveLevelRule(_prev: LevelState, formData: FormData): Promise<LevelState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const level = parseInt(String(formData.get('level') ?? ''), 10);
  const name = String(formData.get('name') ?? '').trim();
  const expRequired = parseInt(String(formData.get('expRequired') ?? ''), 10);
  const icon = normalizeIcon(formData.get('icon'));
  const color = String(formData.get('color') ?? '').trim() || null;
  const dailyRaw = String(formData.get('dailyDownloadLimit') ?? '').trim();
  const dailyDownloadLimit = dailyRaw === '' ? null : Math.max(0, parseInt(dailyRaw, 10) || 0);
  const canPostThread = formData.get('canPostThread') === 'on';
  const canUploadFile = formData.get('canUploadFile') === 'on';

  if (!(level >= 0)) return { error: 'Cấp độ phải là số từ 0 trở lên.' };
  if (name.length < 1) return { error: 'Hãy đặt tên cho cấp độ.' };
  if (!(expRequired >= 0)) return { error: 'EXP yêu cầu phải là số từ 0 trở lên.' };

  const clash = await db.levelRule.findUnique({ where: { level }, select: { id: true } });
  if (clash && clash.id !== id) return { error: `Cấp ${level} đã tồn tại.` };

  const data = { level, name, expRequired, icon, color, dailyDownloadLimit, canPostThread, canUploadFile };
  try {
    if (id) await db.levelRule.update({ where: { id }, data, select: { id: true } });
    else await db.levelRule.create({ data, select: { id: true } });
  } catch {
    return { error: 'Không lưu được cấp độ.' };
  }
  revalidatePath('/admin/levels');
  return { ok: true };
}

export async function deleteLevelRule(id: string) {
  await requireAdmin();
  await db.levelRule.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/levels');
}

// ─────────────── Menu điều hướng ───────────────

export type NavState = { ok?: boolean; error?: string };

export async function saveNavLink(_prev: NavState, formData: FormData): Promise<NavState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const label = String(formData.get('label') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const icon = normalizeIcon(formData.get('icon'));
  const group = String(formData.get('group') ?? 'header');
  const parentId = String(formData.get('parentId') ?? '').trim() || null;
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;

  if (label.length < 1) return { error: 'Hãy nhập tên hiển thị.' };
  if (!NAV_GROUPS.some((g) => g.value === group)) return { error: 'Nhóm menu không hợp lệ.' };
  if (!isSafeNavUrl(url)) return { error: 'Đường dẫn phải bắt đầu bằng / hoặc http(s)://' };
  if (parentId && parentId === id) return { error: 'Mục không thể là cha của chính nó.' };

  // Mục con của mục con sẽ không hiện ra đâu cả — chặn ngay từ lúc lưu.
  if (parentId) {
    const parent = await db.navLink.findUnique({ where: { id: parentId }, select: { parentId: true, group: true } });
    if (!parent) return { error: 'Không tìm thấy mục cha.' };
    if (parent.parentId) return { error: 'Chỉ hỗ trợ một cấp con.' };
    if (parent.group !== group) return { error: 'Mục cha phải cùng nhóm menu.' };
  }
  // Đang có con mà lại biến thành con của mục khác thì đám con kia sẽ mất hút.
  if (id && parentId) {
    const kids = await db.navLink.count({ where: { parentId: id } });
    if (kids > 0) return { error: 'Mục này đang có mục con nên không thể chuyển thành mục con.' };
  }

  const data = { label, url, icon, group, parentId, order };
  try {
    if (id) await db.navLink.update({ where: { id }, data, select: { id: true } });
    else await db.navLink.create({ data, select: { id: true } });
  } catch {
    return { error: 'Không lưu được mục menu.' };
  }
  revalidatePath('/admin/nav');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteNavLink(id: string) {
  await requireAdmin();
  // Xoá cha thì đưa con lên làm mục gốc thay vì để chúng mồ côi không hiện ra.
  await db.$transaction(async (tx) => {
    await tx.navLink.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await tx.navLink.delete({ where: { id } });
  }).catch(() => {});
  revalidatePath('/admin/nav');
  revalidatePath('/', 'layout');
}

// ─────────────── Cài đặt chung ───────────────

export type SiteState = { ok?: boolean; error?: string };

export async function saveSiteSettings(_prev: SiteState, formData: FormData): Promise<SiteState> {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const tagline = String(formData.get('tagline') ?? '').trim();
  const logo = String(formData.get('logo') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const footerText = String(formData.get('footerText') ?? '').trim();

  if (name.length < 1) return { error: 'Hãy nhập tên trang.' };
  if (logo && !isPublicImageRef(logo)) return { error: 'Logo phải là link ảnh http(s) hoặc ảnh đã tải lên.' };

  const value = { name, tagline, logo, description, footerText };
  await db.siteSetting.upsert({
    where: { key: SITE_SETTING_KEY },
    update: { value },
    create: { key: SITE_SETTING_KEY, value },
  });
  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Thêm các mục mặc định còn thiếu vào menu.
 * Chỉ cần lưu một mục là menu mặc định ngừng được dùng, nên phải có đường
 * đưa chúng trở lại thành mục thật để sửa/xoá từng cái.
 */
export async function restoreDefaultNav(group: string) {
  await requireAdmin();
  if (!NAV_GROUPS.some((g) => g.value === group)) return;

  const existing = await db.navLink.findMany({ where: { group }, select: { url: true, order: true } });
  const have = new Set(existing.map((e) => e.url));
  const missing = NAV_DEFAULTS[group as 'header' | 'footer'].filter((d) => !have.has(d.url));
  if (missing.length === 0) return;

  // Nối vào sau các mục đang có để không xáo trộn thứ tự admin đã sắp.
  let order = existing.length ? Math.max(...existing.map((e) => e.order)) + 1 : 0;
  await db.navLink.createMany({
    data: missing.map((d) => ({ label: d.label, url: d.url, icon: d.icon || null, group, order: order++ })),
  });
  revalidatePath('/admin/nav');
  revalidatePath('/', 'layout');
}

// ─────────────── Điều hành viên diễn đàn ───────────────

export type ModState = { ok?: boolean; error?: string };

export async function addForumModerator(_prev: ModState, formData: FormData): Promise<ModState> {
  await requireAdmin();
  const forumId = String(formData.get('forumId') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim().replace(/^@/, '');
  if (!forumId) return { error: 'Thiếu diễn đàn.' };
  if (!username) return { error: 'Hãy nhập tên đăng nhập của thành viên.' };

  const forum = await db.forum.findUnique({ where: { id: forumId }, select: { id: true, name: true } });
  if (!forum) return { error: 'Không tìm thấy khu vực này.' };

  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true, username: true, name: true, role: true, status: true },
  });
  if (!user) return { error: `Không có thành viên nào tên “${username}”.` };
  if (user.status === 'BANNED') return { error: 'Thành viên này đang bị khoá.' };
  // Admin/mod toàn site đã điều hành được mọi khu vực rồi, gán thêm chỉ gây rối danh sách.
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
    return { error: 'Thành viên này đã có quyền điều hành toàn site, không cần gán riêng.' };
  }

  const dup = await db.forumModerator.findUnique({
    where: { forumId_userId: { forumId, userId: user.id } }, select: { id: true },
  });
  if (dup) return { error: 'Thành viên này đã là điều hành viên của khu vực.' };

  await db.forumModerator.create({ data: { forumId, userId: user.id }, select: { id: true } });
  await notify({
    userId: user.id, type: 'SYSTEM',
    title: 'Bạn được giao quyền điều hành',
    content: `Bạn có thể kiểm duyệt khu vực “${forum.name}”.`,
    link: '/',
  });
  revalidatePath('/admin/moderators');
  return { ok: true };
}

export async function removeForumModerator(id: string) {
  await requireAdmin();
  await db.forumModerator.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/moderators');
}
