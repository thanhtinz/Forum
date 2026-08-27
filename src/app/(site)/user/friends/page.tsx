import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Inbox, Send, UserCheck, Users } from 'lucide-react';
import { auth } from '@/lib/auth';
import { FriendRowActions } from '@/components/user/FriendButton';
import { getFriends, getIncomingRequests, getOutgoingRequests, type FriendRow } from '@/lib/friend';
import { fmtAgo, fmtCount, nickClass } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bạn bè' };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/friends');
  const userId = session.user.id;

  const [friends, incoming, outgoing] = await Promise.all([
    getFriends(userId),
    getIncomingRequests(userId),
    getOutgoingRequests(userId),
  ]);

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
      <Section title="Lời mời kết bạn" icon={<Inbox size={18} />} count={incoming.length}
        empty="Không có lời mời nào đang chờ.">
        {incoming.map((r) => <Row key={r.id} row={r} kind="incoming" showMessage />)}
      </Section>

      <Section title="Lời mời đã gửi" icon={<Send size={18} />} count={outgoing.length}
        empty="Bạn chưa gửi lời mời nào.">
        {outgoing.map((r) => <Row key={r.id} row={r} kind="outgoing" showMessage />)}
      </Section>

      <Section title="Danh sách bạn bè" icon={<UserCheck size={18} />} count={friends.length}
        empty="Chưa có ai. Vào trang cá nhân của người khác rồi bấm Kết bạn.">
        {friends.map((r) => <Row key={r.id} row={r} kind="friend" />)}
      </Section>
    </div>
  );
}

function Section({ title, icon, count, empty, children }: {
  title: string; icon: React.ReactNode; count: number; empty: string; children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="zib-title mb-3 flex items-center gap-2">
        {icon} {title}
        {count > 0 && <span className="retro-count">{fmtCount(count)}</span>}
      </h2>
      {count === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-400">{empty}</p>
      ) : (
        <ul className="card retro-stripe divide-y divide-ink-100 dark:divide-ink-800">{children}</ul>
      )}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {row.user.image
          ? <img src={row.user.image} alt="" className="size-10 rounded-lg object-cover" />
          : <span className="grid size-10 place-items-center rounded-lg bg-brand-500 font-bold text-white">
              {name[0]?.toUpperCase()}
            </span>}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <Link href={`/u/${row.user.username ?? ''}`} className={`font-bold hover:underline ${nickClass(row.user.role)}`}>
            {name}
          </Link>
          <span className="retro-sub text-ink-400">Lv{row.user.level}</span>
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
