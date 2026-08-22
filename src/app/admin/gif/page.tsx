import type { Metadata } from 'next';
import { getGifConfig } from '@/lib/gif';
import { GifSettings } from '@/components/admin/GifSettings';

export const metadata: Metadata = { title: 'GIF' };
export const dynamic = 'force-dynamic';

export default async function AdminGifPage() {
  const gif = await getGifConfig();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">GIF</h1>
        <p className="text-sm text-ink-500">Kết nối Tenor hoặc Giphy để thành viên chèn GIF khi trả lời.</p>
      </div>
      <GifSettings provider={gif.provider} hasKey={!!gif.apiKey} enabled={gif.enabled} />
    </div>
  );
}
