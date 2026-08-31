import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/site';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';

export const metadata: Metadata = { title: 'Cài đặt chung' };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Cài đặt chung</h1>
        <p className="text-sm text-ink-500">Tên trang, logo, mô tả và mức hoa hồng dùng chung cho toàn site.</p>
      </div>
      <SiteSettingsForm initial={settings} />
    </div>
  );
}
