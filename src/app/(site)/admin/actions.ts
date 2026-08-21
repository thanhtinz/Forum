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
