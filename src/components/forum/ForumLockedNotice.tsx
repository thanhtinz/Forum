import Link from 'next/link';
import { Lock, LogIn, MessagesSquare } from 'lucide-react';
import { IconGlyph } from '@/components/IconGlyph';

/**
 * Chắn xem của một khu vực đặt huy hiệu bắt buộc.
 *
 * Khu vực vẫn hiện tên và biểu tượng — không giấu sự tồn tại của nó — nhưng
 * không dựng chủ đề nào cả, cùng nguyên tắc với `GameUnlockBox`: chưa có
 * quyền thì nội dung thật không được lộ ra trong mã nguồn trang.
 */
export function ForumLockedNotice({ name, icon, medalName, loggedIn }: {
  name: string;
  icon: string | null;
  medalName: string | null;
  loggedIn: boolean;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800">
          <IconGlyph icon={icon} fallback={<MessagesSquare size={26} />} className="size-11" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="mt-1 text-sm text-ink-500">Khu vực này không công khai.</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border-2 border-dashed border-amber-400 p-4 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50">
          <Lock size={20} />
        </span>
        <p className="mt-2.5 text-sm text-ink-500">
          Cần có huy hiệu{' '}
          <b className="text-ink-700 dark:text-ink-200">{medalName ?? 'đặc biệt'}</b>{' '}
          mới xem được nội dung ở đây.
        </p>
        {!loggedIn && (
          <Link href="/login" className="btn-primary mt-3 w-full !py-2.5">
            <LogIn size={16} /> Đăng nhập
          </Link>
        )}
      </div>
    </section>
  );
}
