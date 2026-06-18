'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GameApi {
  id: string; slug: string; name: string; baseUrl: string; apiKey?: string | null;
  identifierKind: string; active: boolean; lastTestAt?: string | null; lastTestOk?: boolean | null;
}
interface PortalGame {
  slug: string; name: string; publisher: string; genre: string; iconUrl: string;
  shortDesc?: string | null; featured: boolean; online: boolean; active: boolean; sortOrder: number;
}
const KINDS = [
  { v: 'character_name', l: 'Tên nhân vật' },
  { v: 'character_id', l: 'ID nhân vật' },
  { v: 'ingame_account', l: 'Tài khoản ingame' },
];
const emptyGame = { slug: '', name: '', publisher: '', genre: '', iconUrl: '', shortDesc: '', featured: false, online: true, active: true, sortOrder: 0 };
const emptyApi = { slug: '', name: '', baseUrl: '', apiKey: '', identifierKind: 'character_name', active: true };

export default function AdminGameApi() {
  const [games, setGames] = useState<PortalGame[]>([]);
  const [apis, setApis] = useState<GameApi[]>([]);
  const [catalog, setCatalog] = useState<{ slug: string; name: string }[]>([]);
  const [gForm, setGForm] = useState<typeof emptyGame>(emptyGame);
  const [form, setForm] = useState<typeof emptyApi>(emptyApi);
  const [msg, setMsg] = useState('');

  function load() {
    api.get<PortalGame[]>('/game-portal/admin/games').then(setGames).catch((e) => setMsg(e.message));
    api.get<{ apis: GameApi[]; catalog: { slug: string; name: string }[] }>('/game-portal/admin/apis')
      .then((r) => { setApis(r.apis); setCatalog(r.catalog); }).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // ── Game CRUD ──
  async function saveGame() {
    if (!gForm.slug || !gForm.name) { setMsg('Nhập slug và tên game'); return; }
    try { await api.post('/game-portal/admin/games', gForm); setMsg('Đã lưu game'); setGForm(emptyGame); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function delGame(slug: string) {
    if (!confirm(`Xoá game "${slug}" và cấu hình API của nó?`)) return;
    try { await api.del(`/game-portal/admin/games/${slug}`); load(); } catch (e: any) { setMsg(e.message); }
  }

  // ── API CRUD ──
  async function saveApi() {
    if (!form.slug || !form.baseUrl) { setMsg('Chọn game và nhập Base URL'); return; }
    try { await api.post('/game-portal/admin/apis', form); setMsg('Đã lưu cấu hình API'); setForm(emptyApi); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function test(id: string) {
    try { const r = await api.post<{ ok: boolean; message: string }>(`/game-portal/admin/apis/${id}/test`); setMsg(`Test: ${r.message}`); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function delApi(id: string) {
    if (!confirm('Xoá cấu hình API này?')) return;
    try { await api.del(`/game-portal/admin/apis/${id}`); load(); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Cổng game — Game & Đấu API</h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* ───── Quản lý game ───── */}
      <section className="space-y-3">
        <h2 className="font-semibold">1. Game trong cổng</h2>
        <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <label className="text-sm">Slug (định danh, vd: nhat-kiem-mon)
            <input className="input mt-1" value={gForm.slug} onChange={(e) => setGForm({ ...gForm, slug: e.target.value })} />
          </label>
          <label className="text-sm">Tên game
            <input className="input mt-1" value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })} />
          </label>
          <label className="text-sm">Nhà phát hành
            <input className="input mt-1" value={gForm.publisher} onChange={(e) => setGForm({ ...gForm, publisher: e.target.value })} />
          </label>
          <label className="text-sm">Thể loại
            <input className="input mt-1" value={gForm.genre} onChange={(e) => setGForm({ ...gForm, genre: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">Icon URL
            <input className="input mt-1" value={gForm.iconUrl} onChange={(e) => setGForm({ ...gForm, iconUrl: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">Mô tả ngắn
            <input className="input mt-1" value={gForm.shortDesc} onChange={(e) => setGForm({ ...gForm, shortDesc: e.target.value })} />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={gForm.featured} onChange={(e) => setGForm({ ...gForm, featured: e.target.checked })} /> Nổi bật</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={gForm.online} onChange={(e) => setGForm({ ...gForm, online: e.target.checked })} /> Trực tuyến</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={gForm.active} onChange={(e) => setGForm({ ...gForm, active: e.target.checked })} /> Hiển thị</label>
            <label className="flex items-center gap-2">Thứ tự <input type="number" className="input w-20 !py-1" value={gForm.sortOrder} onChange={(e) => setGForm({ ...gForm, sortOrder: Number(e.target.value) })} /></label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={saveGame} className="btn-primary">{games.some((g) => g.slug === gForm.slug) ? 'Cập nhật game' : 'Tạo game'}</button>
            {gForm.slug && <button onClick={() => setGForm(emptyGame)} className="btn-outline">Mới</button>}
          </div>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
              <tr><th className="p-3">Game</th><th className="p-3">NPH / Thể loại</th><th className="p-3">Hiển thị</th><th className="p-3">Hành động</th></tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.slug} className="border-b border-ink-100 dark:border-ink-800">
                  <td className="p-3">{g.name}<div className="text-xs text-ink-400">{g.slug}</div></td>
                  <td className="p-3 text-ink-500">{g.publisher} · {g.genre}</td>
                  <td className="p-3">{g.active ? '✓' : '—'}{g.featured ? ' ⭐' : ''}</td>
                  <td className="p-3"><div className="flex gap-1">
                    <button onClick={() => setGForm({ slug: g.slug, name: g.name, publisher: g.publisher, genre: g.genre, iconUrl: g.iconUrl, shortDesc: g.shortDesc || '', featured: g.featured, online: g.online, active: g.active, sortOrder: g.sortOrder })} className="btn-outline !py-1 text-xs">Sửa</button>
                    <button onClick={() => delGame(g.slug)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                  </div></td>
                </tr>
              ))}
              {games.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-ink-500">Chưa có game.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───── Đấu API ───── */}
      <section className="space-y-3">
        <h2 className="font-semibold">2. Đấu API (REST) cho game</h2>
        <p className="text-sm text-ink-500">Web gọi: <code>GET {'{base}'}/servers</code>, <code>POST /verify</code>, <code>GET /giftcodes</code>, <code>POST /redeem</code>, <code>GET /shop</code>, <code>POST /deliver</code> (kèm <code>Authorization: Bearer {'{apiKey}'}</code>).</p>
        <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <label className="text-sm">Game
            <select className="input mt-1" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value, name: catalog.find((c) => c.slug === e.target.value)?.name || form.name })}>
              <option value="">— Chọn game —</option>
              {catalog.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>)}
            </select>
          </label>
          <label className="text-sm">Kiểu định danh NV
            <select className="input mt-1" value={form.identifierKind} onChange={(e) => setForm({ ...form, identifierKind: e.target.value })}>
              {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">Base URL API
            <input className="input mt-1" placeholder="https://api.game-cua-ban.com" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">API Key (Bearer)
            <input className="input mt-1" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Kích hoạt (dùng API thật thay cho stub)</label>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={saveApi} className="btn-primary">Lưu cấu hình API</button>
            {form.slug && <button onClick={() => setForm(emptyApi)} className="btn-outline">Mới</button>}
          </div>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
              <tr><th className="p-3">Game</th><th className="p-3">Base URL</th><th className="p-3">Trạng thái</th><th className="p-3">Test</th><th className="p-3">Hành động</th></tr>
            </thead>
            <tbody>
              {apis.map((a) => (
                <tr key={a.id} className="border-b border-ink-100 dark:border-ink-800">
                  <td className="p-3">{a.name}<div className="text-xs text-ink-400">{a.slug}</div></td>
                  <td className="p-3 max-w-[220px] truncate text-ink-500">{a.baseUrl}</td>
                  <td className="p-3">{a.active ? <span className="chip bg-emerald-100 text-emerald-700">Bật</span> : <span className="chip bg-ink-100 text-ink-500">Tắt</span>}</td>
                  <td className="p-3 text-xs">{a.lastTestAt ? <span className={a.lastTestOk ? 'text-emerald-600' : 'text-rose-500'}>{a.lastTestOk ? '✓ OK' : '✗ Lỗi'}</span> : '—'}</td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">
                    <button onClick={() => test(a.id)} className="btn-outline !py-1 text-xs">Test</button>
                    <button onClick={() => setForm({ slug: a.slug, name: a.name, baseUrl: a.baseUrl, apiKey: a.apiKey || '', identifierKind: a.identifierKind, active: a.active })} className="btn-outline !py-1 text-xs">Sửa</button>
                    <button onClick={() => delApi(a.id)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                  </div></td>
                </tr>
              ))}
              {apis.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-500">Chưa có cấu hình API.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
