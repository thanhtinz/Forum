import { db } from './db';

/**
 * Nhật ký hành động quản trị.
 *
 * Ghi log là việc phụ: nếu ghi hỏng thì hành động chính vẫn phải tính là xong,
 * nên mọi lỗi ở đây đều được nuốt (xem `logAdmin`).
 */

/** Nhóm hành động — dùng cho bộ lọc và nhãn hiển thị. */
export const AUDIT_GROUPS = [
  { value: 'post', label: 'Bài viết' },
  { value: 'user', label: 'Người dùng' },
  { value: 'category', label: 'Chuyên mục' },
  { value: 'forum', label: 'Khu vực diễn đàn' },
  { value: 'thread', label: 'Chủ đề' },
  { value: 'moderator', label: 'Điều hành viên' },
  { value: 'report', label: 'Báo cáo' },
  { value: 'order', label: 'Đơn hàng' },
  { value: 'withdrawal', label: 'Rút tiền' },
  { value: 'vip', label: 'Gói VIP' },
  { value: 'coupon', label: 'Mã giảm giá' },
  { value: 'medal', label: 'Huy chương' },
  { value: 'level', label: 'Cấp độ' },
  { value: 'nav', label: 'Menu điều hướng' },
  { value: 'appearance', label: 'Giao diện' },
  { value: 'setting', label: 'Cài đặt hệ thống' },
  { value: 'backup', label: 'Sao lưu' },
] as const;

export type AuditGroup = (typeof AUDIT_GROUPS)[number]['value'];

/** Nhãn tiếng Việt cho phần việc của mỗi hành động (`nhóm.việc`). */
const VERB_LABELS: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xoá',
  approve: 'Duyệt',
  reject: 'Từ chối',
  status: 'Đổi trạng thái',
  toggle: 'Bật/tắt',
  feature: 'Đổi nổi bật',
  pin: 'Ghim / bỏ ghim',
  lock: 'Khoá / mở khoá',
  ban: 'Khoá tài khoản',
  unban: 'Gỡ khoá tài khoản',
  role: 'Đổi vai trò',
  paid: 'Xác nhận thanh toán',
  cancel: 'Huỷ',
  add: 'Thêm',
  remove: 'Gỡ bỏ',
  restore: 'Khôi phục mặc định',
  export: 'Tải bản sao lưu',
};

/** "post.approve" → "Bài viết · Duyệt" */
export function actionLabel(action: string): string {
  const [group, verb] = action.split('.');
  const g = AUDIT_GROUPS.find((x) => x.value === group)?.label ?? group;
  return verb ? `${g} · ${VERB_LABELS[verb] ?? verb}` : g;
}

/** Màu badge theo tính chất hành động — xoá/khoá nổi bật hơn để dễ soi. */
export function actionTone(action: string): string {
  const verb = action.split('.')[1] ?? '';
  if (verb === 'delete' || verb === 'ban' || verb === 'reject' || verb === 'cancel') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
  }
  if (verb === 'create' || verb === 'approve' || verb === 'paid' || verb === 'add') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }
  return 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300';
}

export interface AuditInput {
  /** Người thao tác. */
  actor: { id: string; name?: string | null };
  /** `nhóm.việc`, ví dụ `user.ban`. */
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  /** Câu mô tả ngắn, nên kèm tên đối tượng để đọc là hiểu. */
  summary: string;
  meta?: Record<string, unknown> | null;
}

/**
 * Ghi một dòng nhật ký. Không bao giờ ném lỗi ra ngoài — nhật ký hỏng
 * không được phép làm hỏng thao tác quản trị đã thực hiện xong.
 */
export async function logAdmin(input: AuditInput): Promise<void> {
  try {
    let actorName = input.actor.name ?? null;
    if (!actorName) {
      const u = await db.user.findUnique({ where: { id: input.actor.id }, select: { username: true, name: true } });
      actorName = u?.username ?? u?.name ?? null;
    }
    await db.adminLog.create({
      data: {
        actorId: input.actor.id,
        actorName,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        summary: input.summary.slice(0, 500),
        meta: (input.meta ?? undefined) as never,
      },
      select: { id: true },
    });
  } catch {
    // bỏ qua
  }
}

/** Dọn nhật ký cũ hơn `days` ngày. Trả về số dòng đã xoá. */
export async function pruneAdminLogs(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const { count } = await db.adminLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
