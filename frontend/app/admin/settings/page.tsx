'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Settings as SettingsIcon, Globe, MessageSquare, EyeOff, Gem, CreditCard,
  HardDrive, Sparkles, UserPlus, ShieldAlert, Wrench, Image as ImageIcon, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Notice, Btn, Empty } from '@/components/admin/ui';

interface Group { id: string; key: string; name: string; description?: string; settings: { key: string }[]; }

const ICONS: Record<string, any> = {
  general: Globe, forum: MessageSquare, hiddenContent: EyeOff, gem: Gem, payments: CreditCard,
  media: HardDrive, ai: Sparkles, gif: ImageIcon, registration: UserPlus, moderation: ShieldAlert, tools: Wrench,
};

export default function AdminSettings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.get<Group[]>('/admin/config').then(setGroups).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  async function seed() {
    setBusy(true);
    try {
      const r = await api.post<{ groups: number; removedSettings: number; removedGroups: number }>('/admin/config/seed');
      const cleaned = (r.removedSettings || 0) + (r.removedGroups || 0);
      setMsg(cleaned > 0 ? `Đã đồng bộ & dọn ${r.removedSettings} mục + ${r.removedGroups} nhóm cũ.` : 'Đã đồng bộ cấu hình ✓');
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); load(); }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<SettingsIcon size={20} />}
        title="Cấu hình hệ thống"
        desc="Chọn một nhóm để chỉnh. Bấm Đồng bộ để cập nhật nhãn mới và dọn cấu hình của tính năng đã gỡ."
        actions={<Btn variant="outline" size="sm" onClick={seed} disabled={busy}><RefreshCw size={14} /> Đồng bộ & dọn cấu hình</Btn>}
      />

      {msg && <Notice kind="success">{msg}</Notice>}

      {groups.length === 0 ? (
        <Card><Empty title="Chưa có cấu hình" desc='Bấm "Đồng bộ & dọn cấu hình" để khởi tạo.' /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const Icon = ICONS[g.key] || SettingsIcon;
            return (
              <Link key={g.id} href={`/admin/config?group=${g.key}`}
                className="group flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-ink-800 dark:bg-ink-900">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40"><Icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="truncate text-xs text-ink-400">{g.description || `${g.settings.length} mục cấu hình`}</p>
                </div>
                <ChevronRight size={16} className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
