import type { Metadata } from 'next';
import { getR2Config } from '@/lib/storage';
import { StorageSettings } from '@/components/admin/StorageSettings';

export const metadata: Metadata = { title: 'Lưu trữ ảnh' };
export const dynamic = 'force-dynamic';

export default async function AdminStoragePage() {
  const r2 = await getR2Config();
  const fromEnv = !!process.env.R2_ACCOUNT_ID;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Lưu trữ ảnh</h1>
        <p className="text-sm text-ink-500">Nơi lưu ảnh người dùng tải lên và ảnh sticker.</p>
      </div>
      <StorageSettings accountId={r2.accountId} bucket={r2.bucket} publicUrl={r2.publicUrl}
        accessKeyId={r2.accessKeyId} hasSecret={!!r2.secretAccessKey} enabled={r2.enabled} fromEnv={fromEnv} />
    </div>
  );
}
