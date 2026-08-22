import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { SlideManager, FriendLinkManager, type SlideRow, type FriendLinkRow } from '@/components/admin/AppearanceManager';
import { GifSettings } from '@/components/admin/GifSettings';
import { getGifConfig } from '@/lib/gif';

export const metadata: Metadata = { title: 'Giao diện' };
export const dynamic = 'force-dynamic';

export default async function AdminAppearancePage() {
  const gif = await getGifConfig();
  const [slides, links] = await Promise.all([
    db.slide.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, subtitle: true, image: true, link: true, order: true, active: true },
    }),
    db.friendLink.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, url: true, logo: true, description: true, order: true, active: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Giao diện trang</h1>
        <p className="text-sm text-ink-500">Quản lý slide trang chủ, liên kết bạn bè và tính năng GIF.</p>
      </div>
      <GifSettings provider={gif.provider} hasKey={!!gif.apiKey} enabled={gif.enabled} />
      <SlideManager slides={slides as SlideRow[]} />
      <FriendLinkManager links={links as FriendLinkRow[]} />
    </div>
  );
}
