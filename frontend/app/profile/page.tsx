'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';

interface Look {
  gender: string;
  layers: { slot: string; name: string; asset: string | null; zorder: number }[];
  pet: { name: string; asset: string | null } | null;
  mount: { name: string; asset: string | null } | null;
}

function ProfileView() {
  const name = useSearchParams().get('u') || '';
  const [profile, setProfile] = useState<any>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!name) return;
    api.get<any>(`/users/${name}`).then(setProfile).catch((e) => setErr(e.message));
    api.get<Look>(`/wardrobe/look/${name}`).then(setLook).catch(() => {});
  }, [name]);

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!profile) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <div className="card p-6 text-center">
        <div className="mx-auto w-fit"><Avatar user={profile} size={96} /></div>
        <h1 className="mt-3 text-xl font-bold">{profile.displayName || profile.username}</h1>
        <p className="text-sm text-ink-500">@{profile.username}</p>
        {profile.role && profile.role !== 'MEMBER' && (
          <span className="chip mt-2 bg-brand-100 text-brand-700">{profile.role}</span>
        )}
        {profile.bio && <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{profile.bio}</p>}
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
        <div className="card p-5">
          <h2 className="mb-1 font-semibold">Hoạt động</h2>
          <p className="text-sm text-ink-500">Tham gia từ {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi') : '—'}</p>
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
