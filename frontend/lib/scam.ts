// Nhãn tiếng Việt + helper cho hệ thống Tố Cáo Scam

export const TARGET_TYPES: Record<string, string> = {
  USER: 'Người dùng', SELLER: 'Seller', FREELANCER: 'Freelancer',
  EMPLOYER: 'Nhà tuyển dụng', WEBSITE: 'Website', COMMUNITY: 'Nhóm cộng đồng', SERVICE: 'Dịch vụ',
};

export const REASONS: Record<string, string> = {
  FRAUD: 'Lừa đảo', NO_DELIVERY: 'Không giao hàng', NO_PAYMENT: 'Không thanh toán',
  CHARGEBACK: 'Chargeback', FAKE_GOODS: 'Bán hàng giả', STOLEN_ACCOUNT: 'Tài khoản đánh cắp',
  SPAM: 'Spam', IMPERSONATION: 'Mạo danh', HARASSMENT: 'Quấy rối', OTHER: 'Khác',
};

export const STATUSES: Record<string, string> = {
  PENDING: 'Chờ duyệt', VERIFYING: 'Đang xác minh', NEED_EVIDENCE: 'Cần bổ sung bằng chứng',
  CONFIRMED: 'Đã xác nhận scam', INSUFFICIENT: 'Không đủ bằng chứng', RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đóng báo cáo', CLEARED: 'Đã minh oan',
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-ink-200 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  VERIFYING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  NEED_EVIDENCE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CONFIRMED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  INSUFFICIENT: 'bg-ink-200 text-ink-500 dark:bg-ink-800',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CLOSED: 'bg-ink-200 text-ink-500 dark:bg-ink-800',
  CLEARED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export const RISK: Record<string, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nguy hiểm' };
export const RISK_COLOR: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CRITICAL: 'bg-rose-600 text-white',
};

export const EVIDENCE_KINDS: Record<string, string> = {
  IMAGE: 'Ảnh', VIDEO: 'Video', FILE: 'File', CHAT_SCREENSHOT: 'Ảnh chat',
  INVOICE: 'Hóa đơn', CRYPTO_TX: 'Hash giao dịch crypto', LINK: 'Link liên quan', SYSTEM_MSG: 'Tin nhắn hệ thống',
};

export interface ScamCaseCard {
  id: string; targetType: string; reason: string; status: string; riskLevel?: string | null;
  reportedUserId?: string | null; targetName?: string | null; targetUid?: string | null;
  targetEmail?: string | null; targetPhone?: string | null; targetWallet?: string | null;
  targetDomain?: string | null; targetDiscord?: string | null; targetTelegram?: string | null;
  targetFacebook?: string | null; targetZalo?: string | null;
  title: string; damageValue?: number | null; incidentDate?: string | null;
  helpfulCount: number; meTooCount: number; followerCount: number; commentCount: number; viewCount: number;
  createdAt: string;
  reporter?: { id: string; username: string; displayName?: string | null; avatar?: string | null };
  reportedUser?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
}

export function targetLabel(c: ScamCaseCard): string {
  if (c.reportedUser) return c.reportedUser.displayName || c.reportedUser.username;
  return c.targetName || c.targetUid || c.targetWallet || c.targetDomain || c.targetEmail || 'Ẩn danh';
}

export function formatMoney(n?: number | null): string {
  if (!n) return '0₫';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}
