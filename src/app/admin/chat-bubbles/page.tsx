import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ChatBubbleManager, type ChatBubbleRow } from '@/components/admin/ChatBubbleManager';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Bong bóng chat' };
export const dynamic = 'force-dynamic';

export default async function AdminChatBubblesPage() {
  const rows = await db.chatBubbleStyle.findMany({ take: CONFIG_LIST_CAP,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true, name: true, decor: true, colorMine: true, colorTheirs: true,
      darkText: true, active: true, order: true,
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bong bóng chat</h1>
        <p className="text-sm text-ink-500">
          Chọn màu bong bóng và tải ảnh trang trí gắn phía trên (tai chibi, nơ…). Thành viên chọn được trong tuỳ chỉnh đoạn chat.
        </p>
      </div>
      <ChatBubbleManager rows={rows as ChatBubbleRow[]} />
    </div>
  );
}
