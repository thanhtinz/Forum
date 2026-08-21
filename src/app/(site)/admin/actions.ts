'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';
import { grantBalance } from '@/lib/balance';
import { checkAndAwardMedals } from '@/lib/medals';

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

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'muc';
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
