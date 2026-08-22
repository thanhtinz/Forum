'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';
import { grantBalance } from '@/lib/balance';
import { checkAndAwardMedals } from '@/lib/medals';
import { GIF_SETTING_KEY } from '@/lib/gif';

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
  const icon = String(formData.get('icon') ?? '').trim() || null;
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

export async function updateVipPlan(id: string, data: { price: number; originalPrice: number | null; durationDays: number | null; discountPercent: number; freeContent: boolean; active: boolean }) {
  await requireAdmin();
  await db.vipPlan.update({ where: { id }, data });
  revalidatePath('/admin/vip-plans');
  revalidatePath('/vip');
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
  revalidatePath('/admin/appearance');
  return { ok: true };
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
  const icon = String(formData.get('icon') ?? '').trim() || null;
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
  revalidatePath('/admin/appearance');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteSlide(id: string) {
  await requireAdmin();
  await db.slide.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/appearance');
  revalidatePath('/');
}

export async function toggleSlide(id: string) {
  await requireAdmin();
  const s = await db.slide.findUnique({ where: { id }, select: { active: true } });
  if (!s) return;
  await db.slide.update({ where: { id }, data: { active: !s.active } });
  revalidatePath('/admin/appearance');
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
  revalidatePath('/admin/appearance');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteFriendLink(id: string) {
  await requireAdmin();
  await db.friendLink.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/appearance');
  revalidatePath('/');
}

export async function toggleFriendLink(id: string) {
  await requireAdmin();
  const l = await db.friendLink.findUnique({ where: { id }, select: { active: true } });
  if (!l) return;
  await db.friendLink.update({ where: { id }, data: { active: !l.active } });
  revalidatePath('/admin/appearance');
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
