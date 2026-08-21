import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: { default: 'Quản trị', template: '%s · Quản trị' } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="lg:min-w-0">
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
