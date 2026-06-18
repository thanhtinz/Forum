'use client';

import { useEffect, useState } from 'react';
import { X, Users, User, Search, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';

interface Member { id: string; username: string; displayName: string | null; avatar: string | null }

export function NewChat({ onClose, onCreated }: { onClose: () => void; onCreated: (channelId: string) => void }) {
  const [mode, setMode] = useState<'private' | 'group'>('private');
  const [q, setQ] = useState('');
  const [list, setList] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams({ page: '1', limit: '20', sortBy: 'recent' });
      if (q.trim()) params.set('q', q.trim());
      api.get<{ data: Member[] }>(`/social/members?${params}`).then((r) => setList(r.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function toggle(m: Member) {
    if (mode === 'private') { startPrivate(m); return; }
    setSelected((s) => s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]);
  }

  async function startPrivate(m: Member) {
    setBusy(true);
    try { const ch = await api.post<{ id: string }>('/chat/private', { targetUserId: m.id }); onCreated(ch.id); }
    finally { setBusy(false); }
  }
  async function createGroup() {
    if (!groupName.trim() || selected.length === 0) return;
    setBusy(true);
    try {
      const ch = await api.post<{ id: string }>('/chat/group', { name: groupName.trim(), memberIds: selected.map((s) => s.id) });
      onCreated(ch.id);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Tin nhắn mới</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="mb-3 flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
          <button onClick={() => setMode('private')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium ${mode === 'private' ? 'bg-white shadow-card dark:bg-ink-900' : 'text-ink-500'}`}><User size={15} /> Chat riêng</button>
          <button onClick={() => setMode('group')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium ${mode === 'group' ? 'bg-white shadow-card dark:bg-ink-900' : 'text-ink-500'}`}><Users size={15} /> Tạo nhóm</button>
        </div>

        {mode === 'group' && (
          <input className="input mb-2" placeholder="Tên nhóm…" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        )}

        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Tìm thành viên…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {mode === 'group' && selected.length > 0 && (
          <p className="mb-2 text-xs text-ink-500">Đã chọn: {selected.map((s) => s.displayName || s.username).join(', ')}</p>
        )}

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {list.map((m) => {
            const picked = selected.some((x) => x.id === m.id);
            return (
              <button key={m.id} onClick={() => toggle(m)} disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-ink-100 dark:hover:bg-ink-800">
                <Avatar user={m} size={32} />
                <span className="flex-1 truncate text-sm font-medium">{m.displayName || m.username}</span>
                {mode === 'group' && picked && <Check size={16} className="text-brand-600" />}
              </button>
            );
          })}
          {list.length === 0 && <p className="p-4 text-center text-sm text-ink-400">Không có thành viên.</p>}
        </div>

        {mode === 'group' && (
          <button onClick={createGroup} disabled={busy || !groupName.trim() || selected.length === 0} className="btn-primary mt-3 w-full">
            Tạo nhóm ({selected.length})
          </button>
        )}
      </div>
    </div>
  );
}
