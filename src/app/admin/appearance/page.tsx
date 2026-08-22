import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { SlideManager, FriendLinkManager, type SlideRow, type FriendLinkRow } from '@/components/admin/AppearanceManager';
import { GifSettings } from '@/components/admin/GifSettings';
import { getGifConfig } from '@/lib/gif';
import { getR2Config } from '@/lib/storage';
import { StorageSettings } from '@/components/admin/StorageSettings';
import { StickerPackManager, type PackRow } from '@/components/admin/StickerPackManager';

export const metadata: Metadata = { title: 'Giao diện' };
export const dynamic = 'force-dynamic';

export default async function AdminAppearancePage() {
  const gif = await getGifConfig();
  const r2 = await getR2Config();
  const fromEnv = !!process.env.R2_ACCOUNT_ID;
  const packRows = await db.stickerPack.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, active: true,
      _count: { select: { stickers: true } },
      stickers: { orderBy: { order: 'asc' }, take: 8, select: { id: true, url: true, name: true } },
    },
  });
  const packs: PackRow[] = packRows.map((p) => ({
    id: p.id, name: p.name, active: p.active, count: p._count.stickers, preview: p.stickers,
  }));
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
        <p className="text-sm text-ink-500">Quản lý lưu trữ ảnh, bộ sticker, GIF, slide trang chủ và liên kết bạn bè.</p>
      </div>
      <StorageSettings accountId={r2.accountId} bucket={r2.bucket} publicUrl={r2.publicUrl}
        accessKeyId={r2.accessKeyId} hasSecret={!!r2.secretAccessKey} enabled={r2.enabled} fromEnv={fromEnv} />
      <StickerPackManager packs={packs} />
      <GifSettings provider={gif.provider} hasKey={!!gif.apiKey} enabled={gif.enabled} />
      <SlideManager slides={slides as SlideRow[]} />
      <FriendLinkManager links={links as FriendLinkRow[]} />
    </div>
  );
}
