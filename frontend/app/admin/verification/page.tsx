'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { BadgeCheck, Check, X, Save } from 'lucide-react';

interface Requirements {
  minPosts: number;
  minReactionsReceived: number;
  minReputation: number;
  minThreads: number;
}
interface Stats {
  posts: number;
  threads: number;
  reputation: number;
  reactionsReceived: number;
}
interface ReqRequest {
  id: string;
  status: string;
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user: { id: string; username: string; displayName?: string | null; avatar?: string | null };
  stats: Stats;
}

const TABS: { key: string; label: string }[] = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Từ chối' },
];

function statCell(value: number, target: number) {
  const ok = value >= target;
  return (
    <span className={`inline-flex items-center gap-1 ${ok ? 'text-green-600' : 'text-red-500'}`}>
      {ok ? <Check size={13} /> : <X size={13} />}
      {value}/{target}
    </span>
  );
}

export default function AdminVerification() {
  const [requirements, setRequirements] = useState<Requirements>({
    minPosts: 0,
    minReactionsReceived: 0,
    minReputation: 0,
    minThreads: 0,
  });
  const [form, setForm] = useState<Requirements>({
    minPosts: 0,
    minReactionsReceived: 0,
    minReputation: 0,
    minThreads: 0,
  });
  const [requests, setRequests] = useState<ReqRequest[]>([]);
  const [tab, setTab] = useState('PENDING');
  const [msg, setMsg] = useState('');
  const [savingCfg, setSavingCfg] = useState(false);

  function loadConfig() {
    api.get<Requirements>('/verification/admin/requirements').then((r) => {
      setRequirements(r);
      setForm(r);
    }).catch((e) => setMsg(e.message));
  }

  function loadRequests(status: string) {
    api
      .get<{ requirements: Requirements; requests: ReqRequest[] }>(`/verification/admin/requests?status=${status}`)
      .then((r) => {
        setRequirements(r.requirements);
        setRequests(r.requests);
      })
      .catch((e) => setMsg(e.message));
  }

  useEffect(() => { loadConfig(); }, []);
  useEffect(() => { loadRequests(tab); }, [tab]);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingCfg(true);
    setMsg('');
    try {
      const saved = await api.post<Requirements>('/verification/admin/requirements', {
        minPosts: Number(form.minPosts),
        minReactionsReceived: Number(form.minReactionsReceived),
        minReputation: Number(form.minReputation),
        minThreads: Number(form.minThreads),
      });
      setRequirements(saved);
      setForm(saved);
      setMsg('Đã lưu ngưỡng điều kiện.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSavingCfg(false);
    }
  }

  async function approve(id: string) {
    try {
      await api.post(`/verification/admin/requests/${id}/approve`);
      setMsg('Đã duyệt yêu cầu.');
      loadRequests(tab);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function reject(id: string) {
    const note = prompt('Lý do từ chối (tùy chọn):') ?? undefined;
    try {
      await api.post(`/verification/admin/requests/${id}/reject`, { note });
      setMsg('Đã từ chối yêu cầu.');
      loadRequests(tab);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  const cfgFields: { key: keyof Requirements; label: string }[] = [
    { key: 'minPosts', label: 'Bài viết tối thiểu' },
    { key: 'minReactionsReceived', label: 'Cảm xúc nhận tối thiểu' },
    { key: 'minReputation', label: 'Điểm uy tín tối thiểu' },
    { key: 'minThreads', label: 'Chủ đề tối thiểu' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BadgeCheck size={22} className="text-blue-500" />
        <h1 className="text-xl font-bold">Xác minh tài khoản</h1>
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Ngưỡng điều kiện</h2>
        <form onSubmit={saveConfig} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cfgFields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm text-ink-500">{f.label}</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <button className="btn-primary flex items-center gap-1" disabled={savingCfg}>
              <Save size={16} /> {savingCfg ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`chip ${tab === t.key ? '!bg-brand-600 !text-white' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr>
              <th className="p-3">Người dùng</th>
              <th className="p-3">Bài viết</th>
              <th className="p-3">Chủ đề</th>
              <th className="p-3">Cảm xúc</th>
              <th className="p-3">Uy tín</th>
              <th className="p-3">Ngày gửi</th>
              <th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-ink-100 dark:border-ink-800">
                <td className="p-3">
                  <Link href={`/profile?u=${r.user.username}`} className="flex items-center gap-2 hover:underline">
                    <Avatar user={r.user} size={28} />
                    <span>{r.user.displayName || r.user.username}</span>
                  </Link>
                </td>
                <td className="p-3">{statCell(r.stats.posts, requirements.minPosts)}</td>
                <td className="p-3">{statCell(r.stats.threads, requirements.minThreads)}</td>
                <td className="p-3">{statCell(r.stats.reactionsReceived, requirements.minReactionsReceived)}</td>
                <td className="p-3">{statCell(r.stats.reputation, requirements.minReputation)}</td>
                <td className="p-3 text-ink-500">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="p-3">
                  {r.status === 'PENDING' ? (
                    <div className="flex gap-1">
                      <button onClick={() => approve(r.id)} className="btn-outline !p-1.5 text-green-600" title="Duyệt">
                        <Check size={14} />
                      </button>
                      <button onClick={() => reject(r.id)} className="btn-outline !p-1.5 text-red-600" title="Từ chối">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      r.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {r.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-ink-500">Không có yêu cầu nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
