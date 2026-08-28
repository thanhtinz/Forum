import { gzipSync } from 'fflate';
import { db } from './db';

/**
 * Sao lưu dữ liệu ra một tệp JSON nén gzip.
 *
 * Không dùng `pg_dump` vì máy chủ ứng dụng thường không có sẵn công cụ đó;
 * đọc qua Prisma thì chạy được ở mọi nơi và tệp kết quả đọc/khôi phục được
 * bằng chính Prisma. Bù lại toàn bộ dữ liệu phải nằm trong bộ nhớ một lúc —
 * đủ dùng ở quy mô diễn đàn, không hợp với cơ sở dữ liệu hàng chục GB.
 */

export const BACKUP_SETTING_KEY = 'backup_state';

export interface BackupState {
  /** Thời điểm chạy bản sao lưu gần nhất (ISO). */
  lastRunAt: string | null;
  /** Kích thước tệp nén gần nhất, theo byte. */
  lastSize: number;
  /** `admin` nếu bấm tay trong trang quản trị, `cron` nếu gọi bằng token. */
  lastBy: string | null;
}

const EMPTY_STATE: BackupState = { lastRunAt: null, lastSize: 0, lastBy: null };

export async function getBackupState(): Promise<BackupState> {
  const row = await db.siteSetting.findUnique({ where: { key: BACKUP_SETTING_KEY } });
  const v = (row?.value ?? {}) as Partial<BackupState>;
  return { ...EMPTY_STATE, ...v };
}

async function setBackupState(state: BackupState): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: BACKUP_SETTING_KEY },
    update: { value: state as never },
    create: { key: BACKUP_SETTING_KEY, value: state as never },
  });
}

/**
 * Thứ tự bảng theo chiều phụ thuộc khoá ngoại: nạp lại từ trên xuống là hợp lệ.
 * `Session` và `VerificationToken` cố ý bỏ qua — chúng hết hạn nhanh, khôi phục
 * lại chỉ tổ mang theo phiên đăng nhập cũ.
 */
const TABLES = [
  'user', 'account', 'tag',
  'forum', 'forumModerator', 'thread', 'tagsOnThreads',
  'reply', 'comment', 'reaction', 'favorite', 'follow', 'pointsLog',
  'medal', 'userMedal', 'levelRule', 'notification', 'report', 'ban',
  'stickerPack', 'sticker', 'siteSetting', 'slide', 'navLink', 'friendLink',
  'conversation', 'message', 'messageReaction', 'block', 'adminLog',
] as const;

export type BackupTable = (typeof TABLES)[number];

export interface BackupResult {
  filename: string;
  /** Nội dung tệp .json.gz. */
  body: Uint8Array;
  /** Số bản ghi theo từng bảng. */
  counts: Record<string, number>;
  total: number;
}

/** Ngày giờ dạng `20260823-1435` để đặt tên tệp. */
function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Đọc toàn bộ dữ liệu và trả về tệp JSON đã nén. Có ghi lại lần chạy. */
export async function createBackup(by: string): Promise<BackupResult> {
  const now = new Date();
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  let total = 0;

  for (const table of TABLES) {
    // Delegate của Prisma cùng hình dạng nên gọi động được; ép kiểu ở một chỗ duy nhất.
    const delegate = (db as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[table];
    const rows = await delegate.findMany();
    data[table] = rows;
    counts[table] = rows.length;
    total += rows.length;
  }

  const payload = {
    version: 1,
    createdAt: now.toISOString(),
    tables: TABLES,
    counts,
    data,
  };

  const body = gzipSync(new TextEncoder().encode(JSON.stringify(payload)), { level: 6 });
  await setBackupState({ lastRunAt: now.toISOString(), lastSize: body.byteLength, lastBy: by });

  return { filename: `nova-backup-${stamp(now)}.json.gz`, body, counts, total };
}

/**
 * Token cho lịch sao lưu tự động (cron gọi vào API). Chỉ bật khi biến môi
 * trường `BACKUP_TOKEN` được đặt — không có token thì không có cửa vào nào
 * ngoài phiên đăng nhập quản trị.
 */
export function backupTokenValid(token: string | null): boolean {
  const expected = process.env.BACKUP_TOKEN ?? '';
  if (!expected || !token) return false;
  if (token.length !== expected.length) return false;
  // So sánh hết chuỗi để thời gian trả lời không phụ thuộc vị trí ký tự sai.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function backupEnabledForCron(): boolean {
  return Boolean(process.env.BACKUP_TOKEN);
}

/** "1,2 MB" */
export function fmtBytes(n: number): string {
  if (n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
