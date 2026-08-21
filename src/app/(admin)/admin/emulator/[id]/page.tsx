import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { ProfileForm } from '@/components/admin/ProfileForm';
import { deleteProfile } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sửa emulator profile', robots: { index: false } };

export default async function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await db.emulatorProfile.findUnique({
    where: { id },
    include: {
      _count: { select: { sessions: true, gameProfiles: true, defaultForGames: true } },
      gameProfiles: { include: { game: { select: { title: true, slug: true } } }, take: 30 },
    },
  });
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin/emulator" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
          <ChevronLeft size={15} /> Danh sách profile
        </Link>
        <form action={async () => { 'use server'; await deleteProfile(profile.id); }}>
          <button type="submit" className="btn !py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
            <Trash2 size={14} /> Xoá profile
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h1 className="zib-title mb-1">{profile.name}</h1>
        <p className="mb-4 text-xs text-ink-400">
          {profile._count.gameProfiles} game trong ma trận · {profile._count.defaultForGames} game dùng làm mặc định ·{' '}
          {profile._count.sessions} phiên đã tạo
        </p>
        <ProfileForm value={profile} />
      </div>

      {profile.gameProfiles.length > 0 && (
        <div className="card p-5">
          <h2 className="zib-title mb-3">Game dùng profile này</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {profile.gameProfiles.map((gp) => (
              <li key={gp.id}>
                <Link href={`/games/${gp.game.slug}`} className="chip bg-ink-100 text-ink-600 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">
                  {gp.game.title} · {gp.support}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
