import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ChatBackgroundManager, type ChatBgRow } from '@/components/admin/ChatBackgroundManager';

export const metadata: Metadata = { title: 'Ảnh nền chat' };
export const dynamic = 'force-dynamic';

export default async function AdminChatBackgroundsPage() {
  const rows = await db.chatBackground.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, image: true, dark: true, active: true, order: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Ảnh nền chat</h1>
        <p className="text-sm text-ink-500">
          Ảnh tải lên đây sẽ hiện trong phần tuỳ chỉnh đoạn chat của thành viên, cạnh các nền màu có sẵn.
        </p>
      </div>
      <ChatBackgroundManager rows={rows as ChatBgRow[]} />
    </div>
  );
}
