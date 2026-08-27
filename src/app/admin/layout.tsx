import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminHeader } from '@/components/admin/AdminHeader';

export const metadata: Metadata = { title: { default: 'Quản trị', template: '%s · Quản trị Nova' } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const user = await db.user.findUnique({ where: { id: admin.id }, select: { name: true, username: true, image: true } });

  return (
    <div className="flex min-h-screen flex-col bg-ink-100/60 dark:bg-ink-950">
      <AdminHeader user={{ name: user?.name ?? null, username: user?.username ?? null, image: user?.image ?? null, role: admin.role }} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-4 px-4 py-4 lg:py-6">
        <aside className="hidden shrink-0 lg:block lg:w-[220px]">
          <AdminNav isSuperAdmin={admin.role === 'ADMIN'} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-ink-200 bg-white py-4 text-center text-xs text-ink-400 dark:border-ink-800 dark:bg-ink-950">
        Bảng quản trị Nova Platform · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
