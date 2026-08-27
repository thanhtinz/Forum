import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Inbox, Send, UserCheck, Users } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { FriendRowActions } from '@/components/user/FriendButton';
import {
  getFriends, getIncomingRequests, getOutgoingRequests,
  type FriendPage, type FriendRow,
} from '@/lib/friend';
import { fmtAgo, fmtCount } from '@/lib/utils';
import { Avatar, UserName } from '@/components/user/Cosmetic';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bạn bè' };

const num = (v?: string) => Math.max(1, parseInt(v ?? '1', 10) || 1);

export default async function FriendsPage({ searchParams }: {
  searchParams: Promise<{ den?: string; gui?: string; ban?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/friends');
  const userId = session.user.id;

  // Ba danh sách phân trang độc lập nhau, nên mỗi cái một tham số riêng —
  // dùng chung `?page=` thì lật trang danh sách này lại nhảy cả hai cái kia.
  const { den, gui, ban } = await searchParams;
  const pages = { den: num(den), gui: num(gui), ban: num(ban) };

  const [incoming, outgoing, friends] = await Promise.all([
    getIncomingRequests(userId, pages.den),
    getOutgoingRequests(userId, pages.gui),
    getFriends(userId, pages.ban),
  ]);

  /** Giữ nguyên trang của hai danh sách kia khi lật một danh sách. */
  const keepOthers = (drop: keyof typeof pages) =>
    `/user/friends?${Object.entries(pages)
      .filter(([k]) => k !== drop)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Users size={22} /> Bạn bè
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Kết bạn cần cả hai đồng ý — khác với theo dõi, vốn chỉ một chiều.
        </p>
      </div>

      {/* Lời mời đến trước: đó là thứ đang chờ mình bấm. */}
      <Section title="Lời mời kết bạn" icon={<Inbox size={18} />} data={incoming}
        empty="Không có lời mời nào đang chờ."
        kind="incoming" showMessage page={pages.den} pageParam="den" basePath={keepOthers('den')} />

      <Section title="Lời mời đã gửi" icon={<Send size={18} />} data={outgoing}
        empty="Bạn chưa gửi lời mời nào."
        kind="outgoing" showMessage page={pages.gui} pageParam="gui" basePath={keepOthers('gui')} />

      <Section title="Danh sách bạn bè" icon={<UserCheck size={18} />} data={friends}
        empty="Chưa có ai. Vào trang cá nhân của người khác rồi bấm Kết bạn."
        kind="friend" page={pages.ban} pageParam="ban" basePath={keepOthers('ban')} />
    </div>
  );
}

function Section({ title, icon, data, empty, kind, showMessage, page, pageParam, basePath }: {
  title: string;
  icon: React.ReactNode;
  data: FriendPage;
  empty: string;
  kind: 'incoming' | 'outgoing' | 'friend';
  showMessage?: boolean;
  page: number;
  pageParam: string;
  basePath: string;
}) {
  return (
    <section>
      <h2 className="zib-title mb-3 flex items-center gap-2">
        {icon} {title}
        {data.total > 0 && <span className="retro-count">{fmtCount(data.total)}</span>}
      </h2>

      {data.items.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-400">{empty}</p>
      ) : (
        <ul className="card retro-stripe divide-y divide-ink-100 dark:divide-ink-800">
          {data.items.map((r) => (
            <Row key={r.id} row={r} kind={kind} showMessage={showMessage} />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={data.totalPages} pageParam={pageParam} basePath={basePath} />
    </section>
  );
}

function Row({ row, kind, showMessage }: {
  row: FriendRow; kind: 'incoming' | 'outgoing' | 'friend'; showMessage?: boolean;
}) {
  const name = row.user.name ?? row.user.username ?? 'Ẩn danh';
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
      <Link href={`/u/${row.user.username ?? ''}`} className="shrink-0">
        <Avatar image={row.user.image} name={name} cosmetics={row.user.cosmetics} size={40} rounded="rounded-lg" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <UserName username={row.user.username} name={row.user.name} role={row.user.role}
            level={row.user.level} cosmetics={row.user.cosmetics} />
        </p>
        <p className="retro-sub text-ink-400">
          {kind === 'friend'
            ? `Bạn bè từ ${fmtAgo(row.acceptedAt ?? row.createdAt)}`
            : fmtAgo(row.createdAt)}
        </p>
        {showMessage && row.message && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">“{row.message}”</p>
        )}
      </div>

      <FriendRowActions id={row.id} kind={kind} name={name} />
    </li>
  );
}
