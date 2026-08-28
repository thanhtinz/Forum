import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Users, Lock, ChevronLeft, Crown, Shield } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { UserName, Avatar } from '@/components/user/Cosmetic';
import { ClubJoinButton } from '@/components/club/ClubJoinButton';
import { ClubBoard } from '@/components/club/ClubBoard';
import { ClubOwnerPanel } from '@/components/club/ClubOwnerPanel';
import {
  getClubViewer, getClubMembers, getClubPending, getClubPosts,
  CLUB_JOIN_MODES,
} from '@/lib/club';
import { fmtAgo, fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const club = await db.club.findUnique({ where: { slug }, select: { name: true, description: true } });
  return club
    ? { title: `Câu lạc bộ ${club.name}`, description: club.description ?? undefined }
    : { title: 'Không tìm thấy câu lạc bộ' };
}

const ROLE_ICON = { OWNER: Crown, MOD: Shield, MEMBER: null } as const;

export default async function ClubPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; tv?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRaw, tv: memberPageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const memberPage = Math.max(1, parseInt(memberPageRaw ?? '1', 10) || 1);

  const club = await db.club.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, description: true, avatar: true,
      memberCount: true, postCount: true, joinMode: true, privacy: true,
      ownerId: true, createdAt: true,
      owner: { select: { username: true, name: true } },
    },
  });
  if (!club) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'USER';
  const viewer = await getClubViewer(club, userId, role === 'ADMIN' || role === 'MODERATOR');

  // Bảng tin chỉ HỎI TỚI khi được đọc: nhóm kín mà cứ lấy về rồi mới quyết
  // hiện hay không thì bài vẫn đi xuống trình duyệt, xem mã nguồn là thấy.
  const [members, posts, pending] = await Promise.all([
    getClubMembers(club.id, memberPage),
    viewer.canRead ? getClubPosts(club.id, page) : Promise.resolve(null),
    viewer.isOwner ? getClubPending(club.id) : Promise.resolve([]),
  ]);

  const joinLabel = CLUB_JOIN_MODES.find((m) => m.value === club.joinMode)?.label ?? '';

  return (
    <div className="container-nova py-6">
      <Link href="/clb" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600">
        <ChevronLeft size={16} /> Tất cả câu lạc bộ
      </Link>

      <header className="card mb-5 flex flex-wrap items-start gap-4 p-4 sm:p-5">
        {club.avatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={club.avatar} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
          : (
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-2xl font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {club.name.charAt(0).toUpperCase()}
            </span>
          )}

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-black text-ink-800 dark:text-ink-100">
            {club.name}
            {club.privacy === 'MEMBERS' && (
              <span className="chip gap-1 bg-ink-100 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                <Lock size={12} /> Bảng tin riêng
              </span>
            )}
          </h1>
          {club.description && <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{club.description}</p>}
          <p className="retro-sub mt-1.5 text-ink-400">
            {fmtCount(club.memberCount)} thành viên · {fmtCount(club.postCount)} bài · lập {fmtAgo(club.createdAt)} · {joinLabel}
          </p>
        </div>

        <ClubJoinButton
          clubId={club.id} status={viewer.status} isOwner={viewer.isOwner}
          joinMode={club.joinMode} loggedIn={!!userId} callbackUrl={`/clb/${club.slug}`}
        />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {viewer.isOwner && (
            <ClubOwnerPanel
              clubId={club.id}
              name={club.name}
              description={club.description ?? ''}
              avatar={club.avatar ?? ''}
              joinMode={club.joinMode}
              privacy={club.privacy}
              pending={pending}
            />
          )}

          {posts ? (
            <>
              <ClubBoard clubId={club.id} canPost={viewer.canPost} posts={posts.items}
                viewerId={userId} isOwner={viewer.isOwner} />
              <Pagination page={posts.page} totalPages={posts.totalPages} basePath={`/clb/${club.slug}`} />
            </>
          ) : (
            <div className="card p-8 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800">
                <Lock size={20} />
              </span>
              <p className="mt-2.5 text-sm text-ink-500">
                Bảng tin của câu lạc bộ này chỉ thành viên đọc được.
              </p>
            </div>
          )}
        </div>

        <aside>
          <div className="card p-4">
            <h2 className="zib-title mb-3 flex items-center gap-2"><Users size={16} /> Thành viên</h2>
            <ul className="space-y-2.5">
              {members.items.map((m) => {
                const Icon = ROLE_ICON[m.role as keyof typeof ROLE_ICON];
                return m.user && (
                  <li key={m.id} className="flex items-center gap-2.5">
                    <Avatar image={m.user.image} name={m.user.name ?? m.user.username ?? '?'}
                      cosmetics={m.user.cosmetics} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <UserName username={m.user.username} name={m.user.name} role={m.user.role}
                        level={m.user.level} cosmetics={m.user.cosmetics} />
                    </span>
                    {Icon && <Icon size={14} className="shrink-0 text-amber-500" />}
                  </li>
                );
              })}
            </ul>
            <Pagination page={members.page} totalPages={members.totalPages}
              basePath={`/clb/${club.slug}`} pageParam="tv" />
          </div>
        </aside>
      </div>
    </div>
  );
}
