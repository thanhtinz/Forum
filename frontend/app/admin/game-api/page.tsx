'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GameApi {
  id: string; slug: string; name: string; baseUrl: string; apiKey?: string | null;
  identifierKind: string; active: boolean; lastTestAt?: string | null; lastTestOk?: boolean | null;
}
interface CatalogGame { slug: string; name: string }
const KINDS = [
  { v: 'character_name', l: 'Tên nhân vật' },
  { v: 'character_id', l: 'ID nhân vật' },
  { v: 'ingame_account', l: 'Tài khoản ingame' },
];
const empty = { slug: '', name: '', baseUrl: '', apiKey: '', identifierKind: 'character_name', active: true };

export default function AdminGameApi() {
  const [apis, setApis] = useState<GameApi[]>([]);
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [form, setForm] = useState<typeof empty>(empty);
  const [msg, setMsg] = useState('');

  function load() {
    api.get<{ apis: GameApi[]; catalog: CatalogGame[] }>('/game-portal/admin/apis')
      .then((r) => { setApis(r.apis); setCatalog(r.catalog); }).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function save() {
    if (!form.slug || !form.baseUrl) { setMsg('Chọn game và nhập Base URL'); return; }
    try { await api.post('/game-portal/admin/apis', form); setMsg('Đã lưu cấu hình'); setForm(empty); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function test(id: string) {
    try { const r = await api.post<{ ok: boolean; message: string }>(`/game-portal/admin/apis/${id}/test`); setMsg(`Test: ${r.message}`); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function remove(id: string) {
    if (!confirm('Xoá cấu hình API này?')) return;
    try { await api.del(`/game-portal/admin/apis/${id}`); load(); } catch (e: any) { setMsg(e.message); }
  }
  function edit(a: GameApi) {
    setForm({ slug: a.slug, name: a.name, baseUrl: a.baseUrl, apiKey: a.apiKey || '', identifierKind: a.identifierKind, active: a.active });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Đấu API game (REST)</h1>
      <p className="text-sm text-ink-500">Gắn API server riêng của từng game vào cổng. Web gọi: <code>GET {'{base}'}/servers</code>, <code>POST /verify</code>, <code>GET /giftcodes</code>, <code>POST /redeem</code>, <code>GET /shop</code>, <code>POST /deliver</code> (kèm <code>Authorization: Bearer {'{apiKey}'}</code>).</p>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Form thêm/sửa */}
      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm">Game (slug ở cổng)
          <select className="input mt-1" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value, name: catalog.find((c) => c.slug === e.target.value)?.name || form.name })}>
            <option value="">— Chọn game —</option>
            {catalog.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>)}
          </select>
        </label>
        <label className="text-sm">Tên hiển thị
          <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="text-sm sm:col-span-2">Base URL API
          <input className="input mt-1" placeholder="https://api.game-cua-ban.com" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
        </label>
        <label className="text-sm">API Key (Bearer)
          <input className="input mt-1" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
        </label>
        <label className="text-sm">Kiểu định danh NV
          <select className="input mt-1" value={form.identifierKind} onChange={(e) => setForm({ ...form, identifierKind: e.target.value })}>
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Kích hoạt (dùng API thật thay cho stub)</label>
        <div className="flex gap-2 sm:col-span-2">
          <button onClick={save} className="btn-primary">Lưu cấu hình</button>
          {form.slug && <button onClick={() => setForm(empty)} className="btn-outline">Hủy</button>}
        </div>
      </div>

      {/* Danh sách */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr><th className="p-3">Game</th><th className="p-3">Base URL</th><th className="p-3">Trạng thái</th><th className="p-3">Test gần nhất</th><th className="p-3">Hành động</th></tr>
          </thead>
          <tbody>
            {apis.map((a) => (
              <tr key={a.id} className="border-b border-ink-100 dark:border-ink-800">
                <td className="p-3">{a.name}<div className="text-xs text-ink-400">{a.slug}</div></td>
                <td className="p-3 max-w-[240px] truncate text-ink-500">{a.baseUrl}</td>
                <td className="p-3">{a.active ? <span className="chip bg-emerald-100 text-emerald-700">Bật</span> : <span className="chip bg-ink-100 text-ink-500">Tắt</span>}</td>
                <td className="p-3 text-xs">{a.lastTestAt ? <span className={a.lastTestOk ? 'text-emerald-600' : 'text-rose-500'}>{a.lastTestOk ? '✓ OK' : '✗ Lỗi'} · {new Date(a.lastTestAt).toLocaleString('vi')}</span> : '—'}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => test(a.id)} className="btn-outline !py-1 text-xs">Test</button>
                    <button onClick={() => edit(a)} className="btn-outline !py-1 text-xs">Sửa</button>
                    <button onClick={() => remove(a.id)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
            {apis.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-500">Chưa có cấu hình API game nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
