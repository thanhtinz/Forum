import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ProfileSettingsForm, PasswordForm } from '@/components/user/ProfileSettingsForm';
import { NotifyPrefsForm } from '@/components/user/NotifyPrefsForm';

export const metadata: Metadata = { title: 'Cài đặt tài khoản' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/settings');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, bio: true, signature: true, image: true, cover: true, email: true, passwordHash: true, notifyOff: true },
  });
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-4 flex items-center gap-2">
        <Settings size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Cài đặt tài khoản</h1>
      </div>

      <div className="space-y-4">
        <ProfileSettingsForm initial={{
          name: user.name, username: user.username, bio: user.bio, signature: user.signature,
          image: user.image, cover: user.cover, hasPassword: !!user.passwordHash,
        }} />

        <PasswordForm hasPassword={!!user.passwordHash} username={user.username} />

        <NotifyPrefsForm off={user.notifyOff} />

        <div className="card p-5">
          <h2 className="font-bold">Email đăng nhập</h2>
          <p className="mt-1 text-sm text-ink-500">{user.email ?? 'Chưa liên kết email'}</p>
          <p className="mt-2 text-xs text-ink-400">Cần đổi email? Hãy liên hệ quản trị viên.</p>
        </div>
      </div>
    </div>
  );
}
