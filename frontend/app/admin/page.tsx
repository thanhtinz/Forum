'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/stats').then(setStats).catch((e) => setErr(e.message)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tổng quan</h1>
      {err && <div className="card p-4 text-sm text-ink-500">Không tải được thống kê: {err}</div>}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(stats).flatMap(([group, val]: any) =>
            typeof val === 'object' && val
              ? Object.entries(val).map(([k, v]) => (
                  <div key={group + k} className="card p-4">
                    <div className="text-2xl font-bold">{String(v)}</div>
                    <div className="text-xs text-ink-500">{group}.{k}</div>
                  </div>
                ))
              : [
                  <div key={group} className="card p-4">
                    <div className="text-2xl font-bold">{String(val)}</div>
                    <div className="text-xs text-ink-500">{group}</div>
                  </div>,
                ],
          )}
        </div>
      )}
      <p className="text-sm text-ink-500">Mỗi tính năng phía client đều có mục quản lý tương ứng ở menu trái.</p>
    </div>
  );
}
