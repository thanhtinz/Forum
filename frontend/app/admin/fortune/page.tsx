'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Notice, Empty } from '@/components/admin/ui';

export default function AdminFortune() {
  const [stats, setStats] = useState<any>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/fortune/admin/stats').then(setStats).catch((e) => setMsg(e.message));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader icon={<Sparkles size={20} />} title="Bói toán" desc="Tarot & Cung hoàng đạo — miễn phí, không thu phí người dùng." />
      {msg && <Notice kind="error">{msg}</Notice>}

      <Card>
        <h2 className="mb-2 font-semibold">Thống kê lượt xem</h2>
        {stats ? (
          <>
            <p className="text-sm">Tổng lượt: <b>{stats.total ?? 0}</b></p>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-600 dark:text-ink-300">
              {(stats.byType || []).map((b: any) => <li key={b.type}>{b.type}: <b>{b.count}</b></li>)}
            </ul>
            {(!stats.byType || stats.byType.length === 0) && <Empty title="Chưa có lượt xem nào" />}
          </>
        ) : <p className="text-sm text-ink-400">Đang tải…</p>}
      </Card>
    </div>
  );
}
