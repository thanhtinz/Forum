'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserPlus, UserMinus, Ban, ExternalLink, Medal, Trophy, BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';
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
  const [fields, setFields] = useState<{ field: { id: string; label: string; type: string }; value: string }[]>([]);

  useEffect(() => {
    if (!name) return;
    api.get<any>(`/users/${name}`).then((p) => {
      setProfile(p);
      if (p?.id) {
        api.get<any>(`/trophies/user/${p.id}`).then(setTrophies).catch(() => {});
        api.get<{ followers: number; following: number }>(`/social/users/${p.id}/follow-counts`).then(setCounts).catch(() => {});
        api.get<{ badges: BadgeDescriptor[] }>(`/badges/user/${p.id}`).then((r) => setBadges(r.badges || [])).catch(() => {});
        api.get<{ field: { id: string; label: string; type: string }; value: string }[]>(`/profile-extra/users/${p.id}/fields`).then((r) => setFields((r || []).filter((f) => f.value?.trim()))).catch(() => {});
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

  async function editName() {
    const displayName = prompt('Tên hiển thị mới:', profile?.displayName || '');
    if (displayName === null) return;
    try {
      await api.patch('/users/me', { displayName: displayName.trim() });
      setProfile((p: any) => ({ ...p, displayName: displayName.trim() }));
    } catch (e: any) { alert(e.message); }
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!profile) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const isSelf = user?.id === profile.id;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <div className="card p-6 text-center">
        <div className="mx-auto w-fit"><Avatar user={profile} size={120} fit /></div>
        <h1 className="mt-3 text-xl font-bold">{profile.displayName || profile.username}</h1>
        <p className="text-sm text-ink-500">@{profile.username}</p>
        {badges.length > 0 && (
          <div className="mt-2 flex justify-center"><UserBadges badges={badges} /></div>
        )}
        {profile.bio && <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{profile.bio}</p>}
        {trophies && <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-amber-600"><Medal size={16} /> {trophies.currentTitle} · {trophies.totalPoints} điểm</p>}

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
            <button onClick={editName} className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Đổi tên hiển thị</button>
            {!profile.verifiedBadge && (
              <a href="/settings/verify" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-100 px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"><BadgeCheck size={14} /> Đăng ký tích xanh</a>
            )}
            <a href="/settings/avatar" className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Đổi ảnh đại diện</a>
            <a href="/settings/profile-fields" className="rounded-lg bg-ink-100 px-3 py-1.5 font-medium hover:bg-ink-200 dark:bg-ink-800">Thông tin thêm</a>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Bài" value={profile.threadCount ?? 0} />
          <Stat label="Trả lời" value={profile.postCount ?? 0} />
          <Stat label="Uy tín" value={profile.reputationScore ?? 0} />
        </div>
      </div>

      <div className="space-y-5">
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
        {fields.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Thông tin thêm</h2>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.field.id} className="rounded-lg bg-ink-50 p-3 dark:bg-ink-900">
                  <dt className="text-xs text-ink-500">{f.field.label}</dt>
                  <dd className="mt-0.5 break-words text-sm">
                    {f.field.type === 'url'
                      ? <a href={f.value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">{f.value} <ExternalLink size={12} /></a>
                      : <span className="whitespace-pre-wrap">{f.value}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="card p-5">
          <h2 className="mb-1 font-semibold">Hoạt động</h2>
          <p className="text-sm text-ink-500">Tham gia từ {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi') : '—'}</p>
        </div>

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
