import type { Metadata } from 'next';
import { format } from 'date-fns';
import { DatabaseBackup, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/admin';
import { getBackupState, backupEnabledForCron, fmtBytes } from '@/lib/backup';
import { DownloadBackupButton } from '@/components/admin/DownloadBackupButton';

export const metadata: Metadata = { title: 'Sao lưu dữ liệu' };
export const dynamic = 'force-dynamic';

export default async function AdminBackupPage() {
  await requireSuperAdmin();

  const state = await getBackupState();
  const cronReady = backupEnabledForCron();
  const lastRun = state.lastRunAt ? new Date(state.lastRunAt) : null;
  // Quá một tuần không sao lưu thì coi như đang bỏ bê.
  const stale = !lastRun || Date.now() - lastRun.getTime() > 7 * 86_400_000;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <DatabaseBackup size={20} className="text-brand-500" /> Sao lưu dữ liệu
        </h1>
        <p className="text-sm text-ink-500">
          Xuất toàn bộ dữ liệu ra một tệp <code>.json.gz</code> để giữ ngoài máy chủ.
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-white">Tải bản sao lưu ngay</p>
            <p className="text-sm text-ink-500">
              {lastRun
                ? <>Lần gần nhất: {format(lastRun, 'dd/MM/yyyy HH:mm')} · {fmtBytes(state.lastSize)} · {state.lastBy === 'cron' ? 'tự động' : 'thủ công'}</>
                : 'Chưa từng sao lưu.'}
            </p>
          </div>
          <DownloadBackupButton />
        </div>

        <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${stale
          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>
          {stale ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <p>
            {stale
              ? 'Chưa có bản sao lưu nào trong 7 ngày qua. Hãy tải một bản, hoặc bật lịch tự động ở dưới.'
              : 'Dữ liệu đã được sao lưu gần đây.'}
          </p>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-ink-400" />
          <p className="text-sm font-semibold text-ink-900 dark:text-white">Sao lưu tự động theo lịch</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cronReady
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {cronReady ? 'Đã sẵn sàng' : 'Chưa bật'}
          </span>
        </div>

        <p className="text-sm text-ink-600 dark:text-ink-300">
          Đặt biến môi trường <code>BACKUP_TOKEN</code> rồi cho dịch vụ hẹn giờ (cron của máy chủ,
          Vercel Cron, GitHub Actions…) gọi địa chỉ dưới đây theo lịch. Token gửi trong header
          chứ không đặt trên URL, để không bị lưu lại trong log máy chủ.
        </p>

        <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 text-xs leading-relaxed text-ink-100">
{`# Ví dụ: 3 giờ sáng mỗi ngày
0 3 * * *  curl -fsS -H "Authorization: Bearer $BACKUP_TOKEN" \\
  https://ten-mien-cua-ban/api/admin/backup \\
  -o /duong/dan/luu/nova-$(date +%F).json.gz`}
        </pre>

        {!cronReady && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Khi <code>BACKUP_TOKEN</code> chưa được đặt, chỉ quản trị viên đang đăng nhập mới tải được bản sao lưu.
          </p>
        )}
      </div>

      <div className="card space-y-2 p-4 text-sm text-ink-600 dark:text-ink-300">
        <p className="font-semibold text-ink-900 dark:text-white">Bản sao lưu gồm những gì</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Toàn bộ bảng dữ liệu: thành viên, bài viết, chủ đề, đơn hàng, điểm, nhật ký…</li>
          <li>Không gồm phiên đăng nhập — người dùng sẽ đăng nhập lại sau khi khôi phục.</li>
          <li>Không gồm tệp ảnh đã tải lên; ảnh nằm trên Cloudflare R2 hoặc thư mục <code>public/</code>.</li>
        </ul>
        <p className="pt-1 text-ink-500">
          Tệp chứa dữ liệu cá nhân của mọi thành viên — hãy cất ở nơi an toàn và đừng chia sẻ ra ngoài.
        </p>
      </div>
    </div>
  );
}
