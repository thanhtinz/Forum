'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { api } from '@/lib/api';

interface Group { id: string; key: string; name: string; description?: string; settings: { key: string }[]; }

export default function AdminSettings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [msg, setMsg] = useState('');

  function load() { api.get<Group[]>('/admin/config').then(setGroups).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  async function seed() { try { await api.post('/admin/config/seed'); setMsg('Đã khởi tạo cấu hình'); } catch (e: any) { setMsg(e.message); } load(); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cấu hình hệ thống</h1>
        <button onClick={seed} className="btn-outline text-xs">Khởi tạo cấu hình mặc định</button>
      </div>
      <p className="text-sm text-ink-500">Mỗi nhóm cấu hình là một trang riêng cho gọn. Chọn nhóm để chỉnh.</p>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      {groups.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có cấu hình. Bấm "Khởi tạo cấu hình mặc định".</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Link key={g.id} href={`/admin/config?group=${g.key}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-ink-800"><SettingsIcon size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{g.name}</p>
              <p className="text-xs text-ink-400">{g.settings.length} mục</p>
            </div>
            <ChevronRight size={16} className="text-ink-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
