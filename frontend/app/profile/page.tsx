'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserPlus, UserMinus, Send, Heart, Trash2, Ban, ExternalLink, Medal, Trophy, BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { UserBadges, type BadgeDescriptor } from '@/components/UserBadges';

interface Look {
  gender: string;
  layers: { slot: string; name: string; asset: string | null; zorder: number }[];
  pet: { name: string; asset: string | null } | null;
  mount: { name: string; asset: string | null } | null;
}

interface WallAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
}
interface WallComment {
  id: string;
  content: string;
  createdAt: string;
  author: WallAuthor;
}
interface WallPost {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  author: WallAuthor;
  comments: WallComment[];
}

function ProfileView() {
  const name = useSearchParams().get('u') || '';
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [look, setLook] = useState<Look | null>(null);
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
    api.get<Look>(`/wardrobe/look/${name}`).then(setLook).catch(() => {});
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
            <a href="/settings/verify" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-100 px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"><BadgeCheck size={14} /> Đăng ký tích xanh</a>
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
        {look && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Diện mạo nhân vật</h2>
            <div className="flex flex-wrap gap-3">
              {look.layers.length === 0 && <p className="text-sm text-ink-500">Chưa trang bị cosmetic.</p>}
              {look.layers.map((l) => <AssetCard key={l.slot} name={l.name} asset={l.asset} tag={l.slot} />)}
              {look.pet && <AssetCard name={look.pet.name} asset={look.pet.asset} tag="PET" />}
              {look.mount && <AssetCard name={look.mount.name} asset={look.mount.asset} tag="MOUNT" />}
            </div>
          </div>
        )}
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
  const { user } = useAuth();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<{ data: WallPost[] }>(`/social/wall/${wallId}?page=1&limit=20`).then((r) => setPosts(r.data)).catch(() => {});
  }
  useEffect(() => { if (wallId) load(); }, [wallId]);

  async function submit() {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      await api.post(`/social/wall/${wallId}`, { content });
      setContent('');
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Xóa bài viết này?')) return;
    try { await api.del(`/social/profile-posts/${id}`); load(); } catch (e: any) { alert(e.message); }
  }

  async function like(id: string) {
    try {
      await api.post(`/social/profile-posts/${id}/like`);
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likeCount: p.likeCount + 1 } : p)));
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">Tường nhà</h2>

      {user && (
        <div className="mb-4 flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết gì đó lên tường…"
            className="input min-h-[44px] flex-1 resize-y"
            maxLength={2000}
          />
          <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-1 self-start">
            <Send size={16} /> Đăng
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-ink-500">Chưa có bài viết nào trên tường.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <WallPostCard key={p.id} post={p} canDelete={user?.id === p.author.id || user?.id === wallId || user?.role === 'ADMIN' || user?.role === 'MODERATOR'} onDelete={() => remove(p.id)} onLike={() => like(p.id)} onCommented={load} loggedIn={!!user} />
          ))}
        </div>
      )}
    </div>
  );
}

function WallPostCard({ post, canDelete, onDelete, onLike, onCommented, loggedIn }: {
  post: WallPost; canDelete: boolean; onDelete: () => void; onLike: () => void; onCommented: () => void; loggedIn: boolean;
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function addComment() {
    if (!comment.trim() || busy) return;
    setBusy(true);
    try {
      await api.post(`/social/profile-posts/${post.id}/comments`, { content: comment });
      setComment('');
      onCommented();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
      <div className="flex items-start gap-3">
        <Avatar user={post.author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <a href={`/profile?u=${post.author.username}`} className="text-sm font-semibold hover:underline">{post.author.displayName || post.author.username}</a>
              <span className="ml-2 text-xs text-ink-500">{new Date(post.createdAt).toLocaleString('vi')}</span>
            </div>
            {canDelete && (
              <button onClick={onDelete} className="text-ink-400 hover:text-red-500" title="Xóa"><Trash2 size={15} /></button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{post.content}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
            <button onClick={onLike} className="inline-flex items-center gap-1 hover:text-rose-500"><Heart size={14} /> {post.likeCount}</button>
          </div>

          {post.comments.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-ink-100 pl-3 dark:border-ink-800">
              {post.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar user={c.author} size={26} />
                  <div className="min-w-0">
                    <a href={`/profile?u=${c.author.username}`} className="text-xs font-semibold hover:underline">{c.author.displayName || c.author.username}</a>
                    <span className="ml-1 text-[11px] text-ink-400">{new Date(c.createdAt).toLocaleString('vi')}</span>
                    <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loggedIn && (
            <div className="mt-3 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
                placeholder="Bình luận…"
                className="input flex-1 text-sm"
                maxLength={2000}
              />
              <button onClick={addComment} disabled={busy} className="btn-primary px-3 text-sm">Gửi</button>
            </div>
          )}
        </div>
      </div>
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

function AssetCard({ name, asset, tag }: { name: string; asset: string | null; tag: string }) {
  return (
    <div className="w-20 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-xl border border-ink-200/70 bg-ink-50 dark:border-ink-800 dark:bg-ink-900">
        {asset
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={asset} alt={name} className="max-h-16 max-w-16 object-contain" />
          : <span className="text-xs text-ink-400">{tag}</span>}
      </div>
      <div className="mt-1 truncate text-xs">{name}</div>
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
