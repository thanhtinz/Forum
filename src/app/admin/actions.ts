'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { recountForum, recountThread } from '@/lib/forum-counters';
import { notify } from '@/lib/notify';
import { checkAndAwardMedals, MEDAL_CONDITIONS } from '@/lib/medals';
import { GIF_SETTING_KEY } from '@/lib/gif';
import { R2_SETTING_KEY, deleteFile } from '@/lib/storage';
import { normalizeIcon, isPublicImageRef } from '@/lib/icon';
import { NAV_GROUPS, NAV_DEFAULTS, isSafeNavUrl } from '@/lib/nav';
import { SITE_SETTING_KEY } from '@/lib/site';
import { isBanScope, banExpiry } from '@/lib/ban';
import { logAdmin, pruneAdminLogs } from '@/lib/audit';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

/** Nhãn tiếng Việt của trạng thái nội dung, dùng khi ghi nhật ký quản trị. */
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'đã đăng', PENDING: 'chờ duyệt', ARCHIVED: 'đã ẩn', DRAFT: 'bản nháp', HIDDEN: 'đã ẩn',
};

/** Chuỗi thành slug: bỏ dấu, thay khoảng trắng bằng gạch nối. */
function slugify(s: string, fallback = 'muc'): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || fallback;
}
import { saveClubConfig } from '@/lib/club';

// ─────────────── Người dùng ───────────────

export async function setUserRole(id: string, role: 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN') {
  const admin = await requireSuperAdmin();
  const before = await db.user.findUnique({ where: { id }, select: { role: true, username: true } });
  await db.user.update({ where: { id }, data: { role } });
  await logAdmin({
    actor: admin, action: 'user.role', targetType: 'user', targetId: id,
    summary: `Đổi vai trò của @${before?.username ?? id}: ${before?.role ?? '?'} → ${role}`,
    meta: { from: before?.role, to: role },
  });
  revalidatePath('/admin/users');
}

export type BanState = { ok?: boolean; error?: string };

export async function banUser(_prev: BanState, formData: FormData): Promise<BanState> {
  const admin = await requireAdmin();
  const id = String(formData.get('userId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  const scope = String(formData.get('scope') ?? 'FULL');
  const days = parseInt(String(formData.get('days') ?? '0'), 10) || 0;

  if (!isBanScope(scope)) return { error: 'Phạm vi khoá không hợp lệ.' };
  if (reason.length < 3) return { error: 'Hãy ghi lý do khoá (ít nhất 3 ký tự).' };

  const u = await db.user.findUnique({ where: { id }, select: { role: true, username: true } });
  if (!u) return { error: 'Không tìm thấy thành viên.' };
  if (u.role === 'ADMIN') return { error: 'Không khoá được quản trị viên.' };

  const expiresAt = banExpiry(days);
  await db.$transaction(async (tx) => {
    // Cùng phạm vi thì lệnh mới thay lệnh cũ, tránh chồng nhiều lệnh mâu thuẫn.
    await tx.ban.deleteMany({ where: { userId: id, scope } });
    await tx.ban.create({ data: { userId: id, reason, scope, expiresAt, createdBy: admin.id } });
    // Chỉ khoá FULL mới chặn đăng nhập; POST/COMMENT vẫn cho vào để đọc.
    if (scope === 'FULL') await tx.user.update({ where: { id }, data: { status: 'BANNED' }, select: { id: true } });
  });

  if (scope !== 'FULL') {
    await notify({
      userId: id, type: 'SYSTEM',
      title: scope === 'POST' ? 'Bạn bị cấm đăng bài' : 'Bạn bị cấm bình luận',
      content: expiresAt ? `Tới ${expiresAt.toLocaleString('vi-VN')}. Lý do: ${reason}` : `Vĩnh viễn. Lý do: ${reason}`,
      link: '/',
    });
  }
  await logAdmin({
    actor: admin, action: 'user.ban', targetType: 'user', targetId: id,
    summary: `Khoá @${u.username ?? id} (${scope}) ${expiresAt ? `tới ${expiresAt.toLocaleDateString('vi-VN')}` : 'vĩnh viễn'} — ${reason}`,
    meta: { scope, days, reason, expiresAt },
  });
  revalidatePath('/admin/users');
  return { ok: true };
}

/** Gỡ một phạm vi khoá; gỡ FULL thì mở lại đăng nhập. */
export async function unbanUser(id: string, scope: string) {
  const admin = await requireAdmin();
  if (!isBanScope(scope)) return;
  const u = await db.user.findUnique({ where: { id }, select: { username: true } });
  await db.$transaction(async (tx) => {
    await tx.ban.deleteMany({ where: { userId: id, scope } });
    if (scope === 'FULL') await tx.user.update({ where: { id }, data: { status: 'ACTIVE' }, select: { id: true } });
  });
  await logAdmin({
    actor: admin, action: 'user.unban', targetType: 'user', targetId: id,
    summary: `Gỡ khoá ${scope} cho @${u?.username ?? id}`, meta: { scope },
  });
  revalidatePath('/admin/users');
}

// ─────────────── Cấu hình GIF ───────────────

export type GifSettingState = { ok?: boolean; error?: string };

export async function saveGifConfig(_prev: GifSettingState, formData: FormData): Promise<GifSettingState> {
  const admin = await requireAdmin();
  const provider = String(formData.get('provider') ?? 'tenor') === 'giphy' ? 'giphy' : 'tenor';
  const apiKey = String(formData.get('apiKey') ?? '').trim();
  const enabled = formData.get('enabled') === 'on';

  if (enabled && !apiKey) return { error: 'Hãy nhập khoá API trước khi bật.' };

  await db.siteSetting.upsert({
    where: { key: GIF_SETTING_KEY },
    update: { value: { provider, apiKey, enabled } },
    create: { key: GIF_SETTING_KEY, value: { provider, apiKey, enabled } },
  });
  // Không ghi apiKey vào nhật ký — nhật ký đọc được bởi mọi quản trị viên.
  await logAdmin({
    actor: admin, action: 'setting.update', targetType: 'setting', targetId: GIF_SETTING_KEY,
    summary: `Cấu hình GIF: ${provider}, ${enabled ? 'đang bật' : 'đang tắt'}`, meta: { provider, enabled },
  });
  revalidatePath('/admin/gif');
  return { ok: true };
}

// ─────────────── Lưu trữ Cloudflare R2 ───────────────

export type R2State = { ok?: boolean; error?: string };

export async function saveR2Config(_prev: R2State, formData: FormData): Promise<R2State> {
  const admin = await requireSuperAdmin();
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
  // Cố ý không ghi accessKeyId/secret vào nhật ký.
  await logAdmin({
    actor: admin, action: 'setting.update', targetType: 'setting', targetId: R2_SETTING_KEY,
    summary: `Cấu hình lưu trữ R2: bucket ${bucket || '—'}, ${enabled ? 'đang bật' : 'đang tắt'}`,
    meta: { bucket, publicUrl, enabled },
  });
  revalidatePath('/admin/storage');
  return { ok: true };
}

// ─────────────── Bộ sticker ───────────────

export async function deleteStickerPack(id: string) {
  const admin = await requireSuperAdmin();
  const pack = await db.stickerPack.findUnique({
    where: { id },
    select: { name: true, stickers: { select: { storageKey: true } } },
  });
  for (const s of pack?.stickers ?? []) await deleteFile(s.storageKey ?? '');
  await db.stickerPack.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'setting.delete', targetType: 'stickerPack', targetId: id,
    summary: `Xoá bộ sticker “${pack?.name ?? id}”`,
  });
  revalidatePath('/admin/stickers');
}

export async function toggleStickerPack(id: string) {
  const admin = await requireSuperAdmin();
  const p = await db.stickerPack.findUnique({ where: { id }, select: { active: true, name: true } });
  const active = !p?.active;
  await db.stickerPack.update({ where: { id }, data: { active }, select: { id: true } });
  await logAdmin({
    actor: admin, action: 'setting.toggle', targetType: 'stickerPack', targetId: id,
    summary: `${active ? 'Bật' : 'Tắt'} bộ sticker “${p?.name ?? id}”`, meta: { active },
  });
  revalidatePath('/admin/stickers');
}

// ─────────────── Báo cáo ───────────────

export async function setReportStatus(id: string, status: 'RESOLVED' | 'DISMISSED') {
  const admin = await requireAdmin();
  await db.report.update({ where: { id }, data: { status, handledAt: new Date() } });
  await logAdmin({
    actor: admin, action: status === 'RESOLVED' ? 'report.approve' : 'report.status', targetType: 'report', targetId: id,
    summary: status === 'RESOLVED' ? 'Đánh dấu báo cáo đã xử lý' : 'Bỏ qua báo cáo', meta: { status },
  });
  revalidatePath('/admin/reports');
}

/** Duyệt báo cáo và ẩn/xoá nội dung bị báo cáo cùng lúc. */
export async function resolveReportAndRemove(id: string) {
  const admin = await requireAdmin();
  const r = await db.report.findUnique({ where: { id }, select: { threadId: true, replyId: true, commentId: true } });
  if (!r) return;

  // Xoá nội dung thì phải trừ số đếm theo, không thì chủ đề và game khoe nhiều
  // trả lời/bình luận hơn số thật sự còn đọc được.
  const thread = r.threadId
    ? await db.thread.findUnique({ where: { id: r.threadId }, select: { forumId: true } })
    : null;
  const reply = r.replyId
    ? await db.reply.findUnique({
        where: { id: r.replyId },
        select: { threadId: true, thread: { select: { forumId: true } } },
      })
    : null;
  const comment = r.commentId
    ? await db.comment.findUnique({ where: { id: r.commentId }, select: { hidden: true, gameId: true } })
    : null;

  await db.$transaction(async (tx) => {
    if (r.threadId) await tx.thread.delete({ where: { id: r.threadId } }).catch(() => {});
    if (r.replyId) await tx.reply.delete({ where: { id: r.replyId } }).catch(() => {});
    if (r.commentId) await tx.comment.delete({ where: { id: r.commentId } }).catch(() => {});

    // Đếm lại thay vì trừ dần: xoá một trả lời là kéo theo cả phản hồi lồng bên
    // dưới nó, mà trừ đi 1 thì chỉ đúng khi nó không có phản hồi nào.
    if (thread) await recountForum(thread.forumId, tx);
    if (reply) {
      await recountThread(reply.threadId, tx).catch(() => {});
      await recountForum(reply.thread.forumId, tx);
    }
    if (comment && !comment.hidden && comment.gameId) {
      await tx.game.update({ where: { id: comment.gameId }, data: { commentCount: { decrement: 1 } }, select: { id: true } }).catch(() => {});
    }

    await tx.report.update({ where: { id }, data: { status: 'RESOLVED', handledAt: new Date() } });
  });
  const kind = r.threadId ? 'chủ đề' : r.replyId ? 'trả lời' : 'bình luận';
  await logAdmin({
    actor: admin, action: 'report.approve', targetType: 'report', targetId: id,
    summary: `Xử lý báo cáo và gỡ ${kind} bị báo cáo`,
    meta: { threadId: r.threadId, replyId: r.replyId, commentId: r.commentId },
  });
  revalidatePath('/admin/reports');
}

// ─────────────── Chủ đề diễn đàn ───────────────

export async function setThreadStatus(id: string, status: 'PUBLISHED' | 'PENDING' | 'HIDDEN') {
  const admin = await requireAdmin();
  // Bộ đếm của chuyên mục chỉ tính chủ đề đang hiện, nên đổi trạng thái là phải
  // đếm lại: ẩn đi rồi hiện lại mà quên đếm là con số hụt vĩnh viễn.
  const t = await db.$transaction(async (tx) => {
    const row = await tx.thread.update({ where: { id }, data: { status }, select: { title: true, forumId: true } });
    await recountForum(row.forumId, tx);
    return row;
  });
  await logAdmin({
    actor: admin, action: 'thread.status', targetType: 'thread', targetId: id,
    summary: `Đổi chủ đề “${t.title}” sang ${STATUS_LABEL[status] ?? status}`, meta: { status },
  });
  revalidatePath('/admin/threads');
}

export async function toggleThreadPinned(id: string) {
  const admin = await requireAdmin();
  const t = await db.thread.findUnique({ where: { id }, select: { pinned: true, title: true } });
  const pinned = !t?.pinned;
  await db.thread.update({ where: { id }, data: { pinned }, select: { id: true } });
  await logAdmin({
    actor: admin, action: 'thread.pin', targetType: 'thread', targetId: id,
    summary: `${pinned ? 'Ghim' : 'Bỏ ghim'} chủ đề “${t?.title ?? id}”`, meta: { pinned },
  });
  revalidatePath('/admin/threads');
}

export async function toggleThreadLocked(id: string) {
  const admin = await requireAdmin();
  const t = await db.thread.findUnique({ where: { id }, select: { locked: true, title: true } });
  const locked = !t?.locked;
  await db.thread.update({ where: { id }, data: { locked }, select: { id: true } });
  await logAdmin({
    actor: admin, action: 'thread.lock', targetType: 'thread', targetId: id,
    summary: `${locked ? 'Khoá' : 'Mở khoá'} chủ đề “${t?.title ?? id}”`, meta: { locked },
  });
  revalidatePath('/admin/threads');
}

export async function deleteThread(id: string) {
  const admin = await requireAdmin();
  const t = await db.thread.findUnique({ where: { id }, select: { forumId: true, title: true } });
  if (!t) return;
  await db.$transaction(async (tx) => {
    await tx.thread.delete({ where: { id } });
    // Đếm lại cả chủ đề lẫn trả lời: xoá chủ đề là xoá theo mọi trả lời trong nó.
    await recountForum(t.forumId, tx);
  });
  await logAdmin({
    actor: admin, action: 'thread.delete', targetType: 'thread', targetId: id,
    summary: `Xoá chủ đề “${t.title}”`, meta: { forumId: t.forumId },
  });
  revalidatePath('/admin/threads');
}

// ─────────────── Diễn đàn ───────────────

export type ForumState = { ok?: boolean; error?: string };

const FORUM_ACCESS = ['ALL', 'MEMBERS', 'MODERATORS'] as const;
type ForumAccessValue = (typeof FORUM_ACCESS)[number];

function parseForumAccess(raw: unknown): ForumAccessValue {
  const v = String(raw ?? 'ALL');
  return (FORUM_ACCESS as readonly string[]).includes(v) ? (v as ForumAccessValue) : 'ALL';
}

export async function saveForum(_prev: ForumState, formData: FormData): Promise<ForumState> {
  const admin = await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const parentId = String(formData.get('parentId') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const icon = normalizeIcon(formData.get('icon'));
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;
  const postAccess = parseForumAccess(formData.get('postAccess'));
  const minLevel = Math.max(1, parseInt(String(formData.get('minLevel') ?? '1'), 10) || 1);

  if (name.length < 2) return { error: 'Tên diễn đàn quá ngắn.' };
  if (parentId && parentId === id) return { error: 'Diễn đàn không thể là cha của chính nó.' };

  let savedId = id;
  try {
    if (id) {
      await db.forum.update({ where: { id }, data: { name, parentId, description, icon, order, postAccess, minLevel } });
    } else {
      let slug = slugify(name, 'dien-dan');
      if (await db.forum.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString().slice(-4)}`;
      const created = await db.forum.create({ data: { slug, name, parentId, description, icon, order, postAccess, minLevel }, select: { id: true } });
      savedId = created.id;
    }
  } catch {
    return { error: 'Không thể lưu diễn đàn.' };
  }
  await logAdmin({
    actor: admin, action: id ? 'forum.update' : 'forum.create', targetType: 'forum', targetId: savedId,
    summary: `${id ? 'Sửa' : 'Tạo'} khu vực “${name}”`, meta: { postAccess, minLevel },
  });
  revalidatePath('/admin/forums');
  revalidatePath('/forum');
  return { ok: true };
}

export async function deleteForum(id: string) {
  const admin = await requireAdmin();
  const forum = await db.forum.findUnique({ where: { id }, select: { threadCount: true, name: true } });
  if (!forum) return;
  if (forum.threadCount > 0) return; // còn chủ đề thì không xoá, tránh mất dữ liệu
  await db.forum.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'forum.delete', targetType: 'forum', targetId: id,
    summary: `Xoá khu vực “${forum.name}”`,
  });
  revalidatePath('/admin/forums');
  revalidatePath('/forum');
}

// ─────────────── Giao diện: slide & liên kết bạn bè ───────────────

export type AppearanceState = { ok?: boolean; error?: string };

export async function saveSlide(_prev: AppearanceState, formData: FormData): Promise<AppearanceState> {
  const admin = await requireAdmin();
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
  let savedId = id;
  try {
    if (id) await db.slide.update({ where: { id }, data });
    else savedId = (await db.slide.create({ data, select: { id: true } })).id;
  } catch {
    return { error: 'Không thể lưu slide.' };
  }
  await logAdmin({
    actor: admin, action: id ? 'appearance.update' : 'appearance.create', targetType: 'slide', targetId: savedId,
    summary: `${id ? 'Sửa' : 'Thêm'} slide “${title}”`, meta: { active },
  });
  revalidatePath('/admin/slides');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteSlide(id: string) {
  const admin = await requireAdmin();
  const s = await db.slide.findUnique({ where: { id }, select: { title: true } });
  await db.slide.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'appearance.delete', targetType: 'slide', targetId: id,
    summary: `Xoá slide “${s?.title ?? id}”`,
  });
  revalidatePath('/admin/slides');
  revalidatePath('/');
}

export async function toggleSlide(id: string) {
  const admin = await requireAdmin();
  const s = await db.slide.findUnique({ where: { id }, select: { active: true, title: true } });
  if (!s) return;
  await db.slide.update({ where: { id }, data: { active: !s.active } });
  await logAdmin({
    actor: admin, action: 'appearance.toggle', targetType: 'slide', targetId: id,
    summary: `${s.active ? 'Ẩn' : 'Hiện'} slide “${s.title}”`, meta: { active: !s.active },
  });
  revalidatePath('/admin/slides');
  revalidatePath('/');
}

export async function saveFriendLink(_prev: AppearanceState, formData: FormData): Promise<AppearanceState> {
  const admin = await requireAdmin();
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
  let savedId = id;
  try {
    if (id) await db.friendLink.update({ where: { id }, data });
    else savedId = (await db.friendLink.create({ data, select: { id: true } })).id;
  } catch {
    return { error: 'Không thể lưu liên kết.' };
  }
  await logAdmin({
    actor: admin, action: id ? 'appearance.update' : 'appearance.create', targetType: 'friendLink', targetId: savedId,
    summary: `${id ? 'Sửa' : 'Thêm'} liên kết bạn bè “${name}”`, meta: { url, active },
  });
  revalidatePath('/admin/links');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteFriendLink(id: string) {
  const admin = await requireAdmin();
  const l = await db.friendLink.findUnique({ where: { id }, select: { name: true } });
  await db.friendLink.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'appearance.delete', targetType: 'friendLink', targetId: id,
    summary: `Xoá liên kết bạn bè “${l?.name ?? id}”`,
  });
  revalidatePath('/admin/links');
  revalidatePath('/');
}

export async function toggleFriendLink(id: string) {
  const admin = await requireAdmin();
  const l = await db.friendLink.findUnique({ where: { id }, select: { active: true, name: true } });
  if (!l) return;
  await db.friendLink.update({ where: { id }, data: { active: !l.active } });
  await logAdmin({
    actor: admin, action: 'appearance.toggle', targetType: 'friendLink', targetId: id,
    summary: `${l.active ? 'Ẩn' : 'Hiện'} liên kết bạn bè “${l.name}”`, meta: { active: !l.active },
  });
  revalidatePath('/admin/links');
  revalidatePath('/');
}

// ─────────────── Huy chương ───────────────

export type MedalState = { ok?: boolean; error?: string };

export async function saveMedal(_prev: MedalState, formData: FormData): Promise<MedalState> {
  const admin = await requireAdmin();
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

  let savedId = id;
  try {
    if (id) {
      await db.medal.update({ where: { id }, data, select: { id: true } });
    } else {
      let slug = slugify(name, 'huy-chuong');
      if (await db.medal.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString().slice(-4)}`;
      savedId = (await db.medal.create({ data: { ...data, slug }, select: { id: true } })).id;
    }
  } catch {
    return { error: 'Không lưu được huy chương.' };
  }
  await logAdmin({
    actor: admin, action: id ? 'medal.update' : 'medal.create', targetType: 'medal', targetId: savedId,
    summary: `${id ? 'Sửa' : 'Tạo'} huy chương “${name}”`, meta: { conditionType, conditionValue, autoGrant },
  });
  revalidatePath('/admin/medals');
  return { ok: true };
}

export async function deleteMedal(id: string) {
  const admin = await requireAdmin();
  // Xoá huy chương thì bộ sưu tập của thành viên cũng mất, nên chặn khi đã có người nhận.
  const owned = await db.userMedal.count({ where: { medalId: id } });
  if (owned > 0) return;
  const m = await db.medal.findUnique({ where: { id }, select: { name: true } });
  await db.medal.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'medal.delete', targetType: 'medal', targetId: id,
    summary: `Xoá huy chương “${m?.name ?? id}”`,
  });
  revalidatePath('/admin/medals');
}

// ─────────────── Cấp độ ───────────────

export type LevelState = { ok?: boolean; error?: string };

export async function saveLevelRule(_prev: LevelState, formData: FormData): Promise<LevelState> {
  const admin = await requireAdmin();
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
  let savedId = id;
  try {
    if (id) await db.levelRule.update({ where: { id }, data, select: { id: true } });
    else savedId = (await db.levelRule.create({ data, select: { id: true } })).id;
  } catch {
    return { error: 'Không lưu được cấp độ.' };
  }
  await logAdmin({
    actor: admin, action: id ? 'level.update' : 'level.create', targetType: 'levelRule', targetId: savedId,
    summary: `${id ? 'Sửa' : 'Tạo'} cấp ${level} “${name}” — cần ${expRequired.toLocaleString('vi-VN')} EXP`,
    meta: { level, expRequired, dailyDownloadLimit, canPostThread, canUploadFile },
  });
  revalidatePath('/admin/levels');
  return { ok: true };
}

export async function deleteLevelRule(id: string) {
  const admin = await requireAdmin();
  const r = await db.levelRule.findUnique({ where: { id }, select: { level: true, name: true } });
  await db.levelRule.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'level.delete', targetType: 'levelRule', targetId: id,
    summary: `Xoá cấp ${r?.level ?? '?'} “${r?.name ?? id}”`,
  });
  revalidatePath('/admin/levels');
}

// ─────────────── Menu điều hướng ───────────────

export type NavState = { ok?: boolean; error?: string };

export async function saveNavLink(_prev: NavState, formData: FormData): Promise<NavState> {
  const admin = await requireAdmin();
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
  let savedId = id;
  try {
    if (id) await db.navLink.update({ where: { id }, data, select: { id: true } });
    else savedId = (await db.navLink.create({ data, select: { id: true } })).id;
  } catch {
    return { error: 'Không lưu được mục menu.' };
  }
  await logAdmin({
    actor: admin, action: id ? 'nav.update' : 'nav.create', targetType: 'navLink', targetId: savedId,
    summary: `${id ? 'Sửa' : 'Thêm'} mục menu “${label}” (${group}) → ${url}`, meta: { group, url },
  });
  revalidatePath('/admin/nav');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteNavLink(id: string) {
  const admin = await requireAdmin();
  const item = await db.navLink.findUnique({ where: { id }, select: { label: true, group: true } });
  // Xoá cha thì đưa con lên làm mục gốc thay vì để chúng mồ côi không hiện ra.
  await db.$transaction(async (tx) => {
    await tx.navLink.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await tx.navLink.delete({ where: { id } });
  }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'nav.delete', targetType: 'navLink', targetId: id,
    summary: `Xoá mục menu “${item?.label ?? id}”`, meta: { group: item?.group },
  });
  revalidatePath('/admin/nav');
  revalidatePath('/', 'layout');
}

// ─────────────── Cài đặt chung ───────────────

export type SiteState = { ok?: boolean; error?: string };

export async function saveSiteSettings(_prev: SiteState, formData: FormData): Promise<SiteState> {
  const admin = await requireAdmin();
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
  await logAdmin({
    actor: admin, action: 'setting.update', targetType: 'setting', targetId: SITE_SETTING_KEY,
    summary: `Cập nhật cài đặt chung — tên trang “${name}”`, meta: value,
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
  const admin = await requireAdmin();
  if (!NAV_GROUPS.some((g) => g.value === group)) return;

  const existing = await db.navLink.findMany({ take: CONFIG_LIST_CAP, where: { group }, select: { url: true, order: true } });
  const have = new Set(existing.map((e) => e.url));
  const missing = NAV_DEFAULTS[group as 'header' | 'footer'].filter((d) => !have.has(d.url));
  if (missing.length === 0) return;

  // Nối vào sau các mục đang có để không xáo trộn thứ tự admin đã sắp.
  let order = existing.length ? Math.max(...existing.map((e) => e.order)) + 1 : 0;
  await db.navLink.createMany({
    data: missing.map((d) => ({ label: d.label, url: d.url, icon: d.icon || null, group, order: order++ })),
  });
  await logAdmin({
    actor: admin, action: 'nav.restore', targetType: 'navLink', targetId: null,
    summary: `Thêm lại ${missing.length} mục menu mặc định vào nhóm ${group}`,
    meta: { group, labels: missing.map((d) => d.label) },
  });
  revalidatePath('/admin/nav');
  revalidatePath('/', 'layout');
}

// ─────────────── Điều hành viên diễn đàn ───────────────

export type ModState = { ok?: boolean; error?: string };

export async function addForumModerator(_prev: ModState, formData: FormData): Promise<ModState> {
  const admin = await requireAdmin();
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

  const created = await db.forumModerator.create({ data: { forumId, userId: user.id }, select: { id: true } });
  await logAdmin({
    actor: admin, action: 'moderator.add', targetType: 'forumModerator', targetId: created.id,
    summary: `Giao quyền điều hành khu vực “${forum.name}” cho @${user.username ?? user.id}`,
    meta: { forumId, userId: user.id },
  });
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
  const admin = await requireAdmin();
  const row = await db.forumModerator.findUnique({
    where: { id },
    select: { userId: true, forum: { select: { name: true } } },
  });
  const user = row && await db.user.findUnique({ where: { id: row.userId }, select: { username: true } });
  await db.forumModerator.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'moderator.remove', targetType: 'forumModerator', targetId: id,
    summary: `Gỡ quyền điều hành khu vực “${row?.forum.name ?? '?'}” của @${user?.username ?? '?'}`,
  });
  revalidatePath('/admin/moderators');
}

// ─────────────── Nhật ký quản trị ───────────────

/** Xoá các bản ghi nhật ký cũ hơn `days` ngày. Chính việc dọn cũng được ghi lại. */
export async function pruneLogs(days: number) {
  const admin = await requireSuperAdmin();
  const d = Math.max(30, Math.min(3650, Math.floor(days) || 0));
  const removed = await pruneAdminLogs(d);
  await logAdmin({
    actor: admin, action: 'setting.delete', targetType: 'adminLog', targetId: null,
    summary: `Dọn ${removed} bản ghi nhật ký cũ hơn ${d} ngày`, meta: { days: d, removed },
  });
  revalidatePath('/admin/logs');
}

// ─────────────── Nền & bong bóng chat ───────────────

export type ChatAssetState = { ok?: boolean; error?: string };

export async function saveChatBackground(_prev: ChatAssetState, formData: FormData): Promise<ChatAssetState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const image = String(formData.get('image') ?? '').trim();
  const dark = formData.get('dark') === 'on';
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;

  if (name.length < 1) return { error: 'Hãy đặt tên cho ảnh nền.' };
  if (!image) return { error: 'Hãy tải ảnh lên hoặc dán link ảnh.' };
  if (!isPublicImageRef(image)) return { error: 'Ảnh phải là link http(s) hoặc ảnh đã tải lên.' };

  const data = { name, image, dark, order };
  try {
    if (id) await db.chatBackground.update({ where: { id }, data, select: { id: true } });
    else await db.chatBackground.create({ data, select: { id: true } });
  } catch {
    return { error: 'Không lưu được ảnh nền.' };
  }
  revalidatePath('/admin/chat-backgrounds');
  return { ok: true };
}

export async function deleteChatBackground(id: string) {
  await requireAdmin();
  // Hội thoại đang dùng ảnh này sẽ tự quay về nền mặc định vì tra id không ra.
  await db.chatBackground.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/chat-backgrounds');
}

export async function toggleChatBackground(id: string) {
  await requireAdmin();
  const row = await db.chatBackground.findUnique({ where: { id }, select: { active: true } });
  if (!row) return;
  await db.chatBackground.update({ where: { id }, data: { active: !row.active }, select: { id: true } });
  revalidatePath('/admin/chat-backgrounds');
}

export async function saveChatBubbleStyle(_prev: ChatAssetState, formData: FormData): Promise<ChatAssetState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim() || null;
  const name = String(formData.get('name') ?? '').trim();
  const decor = String(formData.get('decor') ?? '').trim() || null;
  const colorMine = String(formData.get('colorMine') ?? '').trim();
  const colorTheirs = String(formData.get('colorTheirs') ?? '').trim();
  const darkText = formData.get('darkText') === 'on';
  const order = parseInt(String(formData.get('order') ?? '0'), 10) || 0;

  if (name.length < 1) return { error: 'Hãy đặt tên cho kiểu bong bóng.' };
  if (!/^#[0-9a-fA-F]{6}$/.test(colorMine) || !/^#[0-9a-fA-F]{6}$/.test(colorTheirs)) {
    return { error: 'Màu không hợp lệ.' };
  }
  if (decor && !isPublicImageRef(decor)) return { error: 'Ảnh trang trí phải là link http(s) hoặc ảnh đã tải lên.' };

  const data = { name, decor, colorMine, colorTheirs, darkText, order };
  try {
    if (id) await db.chatBubbleStyle.update({ where: { id }, data, select: { id: true } });
    else await db.chatBubbleStyle.create({ data, select: { id: true } });
  } catch {
    return { error: 'Không lưu được kiểu bong bóng.' };
  }
  revalidatePath('/admin/chat-bubbles');
  return { ok: true };
}

export async function deleteChatBubbleStyle(id: string) {
  await requireAdmin();
  await db.chatBubbleStyle.delete({ where: { id } }).catch(() => {});
  revalidatePath('/admin/chat-bubbles');
}

export async function toggleChatBubbleStyle(id: string) {
  await requireAdmin();
  const row = await db.chatBubbleStyle.findUnique({ where: { id }, select: { active: true } });
  if (!row) return;
  await db.chatBubbleStyle.update({ where: { id }, data: { active: !row.active }, select: { id: true } });
  revalidatePath('/admin/chat-bubbles');
}

// ─────────────── Câu lạc bộ ───────────────

export interface ClubSettingState {
  ok?: boolean;
  error?: string;
}

/** Đặt giá lập câu lạc bộ (tính bằng điểm; 0 là cho lập tự do). */
export async function saveClubSettings(_prev: ClubSettingState, formData: FormData): Promise<ClubSettingState> {
  const admin = await requireAdmin();
  const createCost = parseInt(String(formData.get('createCost') ?? '0'), 10);
  if (!Number.isFinite(createCost) || createCost < 0) return { error: 'Giá phải là số không âm.' };
  if (createCost > 1_000_000) return { error: 'Giá quá lớn.' };

  await saveClubConfig({ createCost });
  await logAdmin({
    actor: admin, action: 'setting.update', targetType: 'setting', targetId: 'club',
    summary: `Giá lập câu lạc bộ: ${createCost} điểm`, meta: { createCost },
  });
  revalidatePath('/admin/clubs');
  revalidatePath('/clb');
  return { ok: true };
}

/** Quản trị viên giải tán một câu lạc bộ (nhóm rác, tên bậy…). */
export async function adminDeleteClub(id: string) {
  const admin = await requireAdmin();
  const club = await db.club.findUnique({ where: { id }, select: { name: true } });
  if (!club) return;
  await db.club.delete({ where: { id } }).catch(() => {});
  await logAdmin({
    actor: admin, action: 'club.delete', targetType: 'club', targetId: id,
    summary: `Giải tán câu lạc bộ: ${club.name}`,
  });
  revalidatePath('/admin/clubs');
  revalidatePath('/clb');
}
