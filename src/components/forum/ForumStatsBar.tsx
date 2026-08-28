import Link from 'next/link';
import { db } from '@/lib/db';
import { ONLINE_WINDOW_MS } from '@/lib/members';
import { fmtCount } from '@/lib/utils';
import { bumpOnlineRecord } from '@/lib/online-record';

/** Coi là đang online nếu hoạt động trong 15 phút gần đây — trùng ForumSidebar. */

/**
 * Thanh đếm cuối trang chủ.
 *
 * Forum wap Việt thời JohnCMS đóng trang nào cũng bằng một dòng đếm như thế
 * này: tổng chủ đề, tổng bài, tổng thành viên, ai đang trực tuyến, ai mới vào.
 * Giữ lại đúng nội dung và đúng chữ Tahoma bé xíu ấy, chỉ dựng lại bằng khối
 * card hiện đại thay cho cái bảng viền 1px ngày xưa.
 */
export async function ForumStatsBar() {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);

  const [threads, replies, members, online, newest] = await Promise.all([
    db.thread.count({ where: { status: 'PUBLISHED' } }),
    db.reply.count(),
    db.user.count(),
    db.user.count({ where: { lastSeenAt: { gte: since } } }),
    db.user.findFirst({ orderBy: { createdAt: 'desc' }, select: { username: true, name: true } }),
  ]);

  // Mỗi lần dựng trang chủ cũng là một lần đối chiếu kỷ lục.
  const record = await bumpOnlineRecord(online);

  return (
    <section className="card overflow-hidden">
      <div className="retro-head px-3 py-2 sm:px-4">
        <h2 className="truncate text-sm font-bold uppercase tracking-wide">Thống kê diễn đàn</h2>
      </div>

      {/* gap-px trên nền xám cho ra lưới kẻ 1px đều tăm tắp dù xuống dòng ở
          màn hình hẹp — divide-x sẽ kẻ nhầm vào ô đầu mỗi hàng. */}
      <dl className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-4 dark:bg-ink-800">
        <Stat label="Chủ đề" value={fmtCount(threads)} />
        <Stat label="Bài trả lời" value={fmtCount(replies)} />
        <Stat label="Thành viên" value={fmtCount(members)} />
        <Stat label="Đang trực tuyến" value={fmtCount(online)} highlight />
      </dl>

      <div className="retro-sub retro-rule space-y-0.5 px-3 py-2 text-ink-400 sm:px-4">
        {newest && (
          <p>
            Xin chào thành viên mới nhất:{' '}
            <Link href={`/u/${newest.username ?? ''}`} className="font-bold text-brand-600 hover:underline">
              {newest.name ?? newest.username}
            </Link>
          </p>
        )}
        {record.count > 0 && (
          <p>
            Kỷ lục trực tuyến: <b className="text-ink-600 dark:text-ink-200">{fmtCount(record.count)}</b> thành viên
            {record.at && ` lúc ${new Date(record.at).toLocaleString('vi-VN', {
              hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
            })}`}
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[color:var(--nova-surface)] px-3 py-2.5 text-center">
      <dt className="retro-sub text-ink-400">{label}</dt>
      <dd className={`retro-count mt-1 text-base font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-800 dark:text-ink-100'}`}>
        {value}
      </dd>
    </div>
  );
}
