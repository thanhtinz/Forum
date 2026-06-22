'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserPlus, UserMinus, Ban, MapPin, Cake, Medal, Trophy, BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { cssToStyle } from '@/lib/nameEffect';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { UserBadges, type BadgeDescriptor } from '@/components/UserBadges';

function ProfileView() {
  const name = useSearchParams().get('u') || '';
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [trophies, setTrophies] = useState<any>(null);
  const [err, setErr] = useState('');

  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [badges, setBadges] = useState<BadgeDescriptor[]>([]);

  useEffect(() => {
    if (!name) return;
    api.get<any>(`/users/${name}`).then((p) => {
      setProfile(p);
      if (p?.id) {
        api.get<any>(`/trophies/user/${p.id}`).then(setTrophies).catch(() => {});
        api.get<{ followers: number; following: number }>(`/social/users/${p.id}/follow-counts`).then(setCounts).catch(() => {});
        api.get<{ badges: BadgeDescriptor[] }>(`/badges/user/${p.id}`).then((r) => setBadges(r.badges || [])).catch(() => {});
        if (user && user.id !== p.id) {
          api.get<{ following: boolean }>(`/social/users/${p.id}/follow-state`).then((r) => setFollowing(r.following)).catch(() => {});
          api.get<{ blocked: boolean }>(`/profile-extra/block/${p.id}/state`).then((r) => setBlocked(r.blocked)).catch(() => {});
        }
      }
    }).catch((e) => setErr(e.message));
  }, [name, user]);

  async function toggleFollow() {
    if (!profile?.id) return;
    try {
      const r = await api.post<{ following: boolean }>(`/social/follow/${profile.id}`);
      setFollowing(r.following);
      setCounts((c) => ({ ...c, followers: c.followers + (r.following ? 1 : -1) }));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function toggleBlock() {
    if (!profile?.id) return;
    try {
      const r = await api.post<{ blocked: boolean }>(`/profile-extra/block/${profile.id}`);
      setBlocked(r.blocked);
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!profile) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const isSelf = user?.id === profile.id;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <div className="card p-6 text-center">
        <div className="mx-auto w-fit"><Avatar user={profile} size={96} /></div>
        <h1 className="mt-3 flex items-center justify-center gap-1.5 text-xl font-bold">
          {profile.vipBadgeUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={profile.vipBadgeUrl} alt={profile.vipTierName || 'VIP'} title={profile.vipTierName || 'VIP'} className="h-9 w-9 object-contain" />}
          <span style={cssToStyle(profile.nameEffectCss)}>{profile.displayName || profile.username}</span>
          {profile.shopBadgeUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={profile.shopBadgeUrl} alt="" className="h-7 w-7 object-contain" />}
        </h1>
        <p className="text-sm text-ink-500">@{profile.username}</p>
        {badges.length > 0 && (
          <div className="mt-2 flex justify-center"><UserBadges badges={badges} /></div>
        )}
        {trophies && <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-amber-600"><Medal size={16} /> {trophies.currentTitle} · {trophies.totalPoints} điểm</p>}

        <div className="mt-3 flex items-center justify-center gap-5 text-sm">
          <span><b>{counts.followers}</b> <span className="text-ink-500">người theo dõi</span></span>
          <span><b>{counts.following}</b> <span className="text-ink-500">đang theo dõi</span></span>
        </div>

        {user && !isSelf && (
          <div className="mt-4 space-y-2">
            <button
              onClick={toggleFollow}
              className={`btn-primary inline-flex w-full items-center justify-center gap-2 ${following ? '!bg-ink-200 !text-ink-700 dark:!bg-ink-700 dark:!text-ink-100' : ''}`}
            >
              {following ? <><UserMinus size={16} /> Bỏ theo dõi</> : <><UserPlus size={16} /> Theo dõi</>}
            </button>
            <button
              onClick={toggleBlock}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${blocked ? 'bg-red-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'}`}
            >
              <Ban size={15} /> {blocked ? 'Bỏ chặn' : 'Chặn'}
            </button>
          </div>
        )}

        {isSelf && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <a href="/settings/about" className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Sửa thông tin</a>
            {!profile.verifiedBadge && (
              <a href="/settings/verify" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-100 px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"><BadgeCheck size={14} /> Đăng ký tích xanh</a>
            )}
            <a href="/settings/avatar" className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Đổi ảnh đại diện</a>
            <a href="/settings/decorations" className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Trang trí</a>
            <a href="/settings/account" className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Cài đặt</a>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Bài" value={profile.threadCount ?? 0} />
          <Stat label="Trả lời" value={profile.postCount ?? 0} />
          <Stat label="Uy tín" value={profile.reputationScore ?? 0} />
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Giới thiệu</h2>
          {profile.bio && <p className="mb-3 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{profile.bio}</p>}
          <dl className="space-y-1.5 text-sm">
            {profile.location && (
              <div className="flex items-center gap-2"><MapPin size={14} className="text-ink-400" /> <span className="text-ink-600 dark:text-ink-300">{profile.location}</span></div>
            )}
            {profile.birthdayDisplay && (
              <div className="flex items-center gap-2"><Cake size={14} className="text-ink-400" /> <span className="text-ink-600 dark:text-ink-300">Sinh nhật {profile.birthdayDisplay}</span></div>
            )}
            <div className="flex items-center gap-2"><Medal size={14} className="text-ink-400" /> <span className="text-ink-600 dark:text-ink-300">Tham gia từ {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi') : '—'}</span></div>
          </dl>
        </div>

        {trophies && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Danh hiệu ({trophies.earned}/{trophies.total})</h2>
            {trophies.trophies.length === 0 ? <p className="text-sm text-ink-500">Chưa có danh hiệu nào.</p> : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {trophies.trophies.map((t: any) => (
                  <div key={t.id} className="rounded-xl border border-amber-200/60 p-3 text-center dark:border-ink-800" title={t.description || ''}>
                    <div className="flex justify-center text-2xl">{t.icon ? t.icon : <Trophy size={24} className="text-amber-500" />}</div>
                    <div className="mt-1 truncate text-xs font-medium">{t.name}</div>
                    {t.points ? <div className="text-[11px] text-amber-600">{t.points}đ</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Wall wallId={profile.id} />
      </div>
    </div>
  );
}

function Wall({ wallId }: { wallId: string }) {
  const [threads, setThreads] = useState<any[]>([]);
  useEffect(() => {
    if (!wallId) return;
    api.get<{ data: any[] }>(`/forum/threads?authorId=${wallId}&limit=20&sortBy=createdAt`)
      .then((r) => setThreads(r.data || [])).catch(() => {});
  }, [wallId]);

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">Bài viết trên diễn đàn</h2>
      {threads.length === 0 ? (
        <p className="text-sm text-ink-500">Chưa đăng bài nào trên diễn đàn.</p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {threads.map((t) => (
            <li key={t.id} className="py-2.5">
              <a href={`/thread?slug=${t.slug}`} className="font-medium hover:text-brand-600 hover:underline">{t.title}</a>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                {t.category?.name && <span className="font-medium" style={t.category.color ? { color: t.category.color } : undefined}>{t.category.name}</span>}
                <span>· {t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi') : ''}</span>
                <span>· {t.replyCount ?? t.postCount ?? 0} trả lời</span>
                <span>· {t.viewCount ?? 0} xem</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-100 py-2 dark:bg-ink-800">
      <div className="font-bold">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <ProfileView />
    </Suspense>
  );
}
