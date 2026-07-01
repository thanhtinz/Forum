'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import TipTapEditor from '@/components/TipTapEditor';

interface Page { id: string; slug: string; title: string; content: string; isPublished: boolean; showInNav: boolean; sortOrder: number }
interface NavLink { id: string; label: string; url: string; icon?: string; openNewTab: boolean; sortOrder: number; isActive: boolean }

const EMPTY_PAGE: Partial<Page> = { title: '', content: '', isPublished: true, showInNav: false, sortOrder: 0 };
const EMPTY_LINK: Partial<NavLink> = { label: '', url: '', openNewTab: false, sortOrder: 0, isActive: true };

export default function AdminPages() {
  const [tab, setTab] = useState<'pages' | 'links'>('pages');
  const [pages, setPages] = useState<Page[]>([]);
  const [links, setLinks] = useState<NavLink[]>([]);
  const [pForm, setPForm] = useState<Partial<Page>>(EMPTY_PAGE);
  const [lForm, setLForm] = useState<Partial<NavLink>>(EMPTY_LINK);
  const [msg, setMsg] = useState('');

  function load() {
    api.get<Page[]>('/admin/pages').then(setPages).catch(() => {});
    api.get<NavLink[]>('/admin/nav-links').then(setLinks).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function savePage() {
    try {
      if (pForm.id) await api.patch(`/admin/pages/${pForm.id}`, pForm);
      else await api.post('/admin/pages', pForm);
      setPForm(EMPTY_PAGE); setMsg('Đã lưu trang ✓'); load(); setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setMsg(e.message); }
  }
  async function delPage(id: string) { try { await api.del(`/admin/pages/${id}`); load(); } catch {} }

  async function saveLink() {
    try {
      if (lForm.id) await api.patch(`/admin/nav-links/${lForm.id}`, lForm);
      else await api.post('/admin/nav-links', lForm);
      setLForm(EMPTY_LINK); setMsg('Đã lưu liên kết ✓'); load(); setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setMsg(e.message); }
  }
  async function delLink(id: string) { try { await api.del(`/admin/nav-links/${id}`); load(); } catch {} }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Trang tĩnh & Menu</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab('pages')} className={`rounded-lg px-4 py-1.5 text-sm ${tab === 'pages' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>Trang tĩnh</button>
        <button onClick={() => setTab('links')} className={`rounded-lg px-4 py-1.5 text-sm ${tab === 'links' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>Liên kết menu</button>
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      {tab === 'pages' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-2">
            {pages.map((p) => (
              <div key={p.id} className="card flex items-center justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="truncate text-xs text-ink-400">/p?slug={p.slug}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-500">
                    <span className={p.isPublished ? 'text-emerald-600' : 'text-ink-400'}>{p.isPublished ? 'Hiển thị' : 'Ẩn'}</span>
                    {p.showInNav && <span className="text-brand-600">· Trên menu</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setPForm(p)} className="btn-outline !py-1 text-xs">Sửa</button>
                  <button onClick={() => delPage(p.id)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                </div>
              </div>
            ))}
            {pages.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có trang nào.</div>}
          </div>
          <div className="card space-y-2 p-4">
            <h2 className="font-semibold">{pForm.id ? 'Sửa trang' : 'Tạo trang mới'}</h2>
            <input className="input" placeholder="Tiêu đề" value={pForm.title || ''} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} />
            <input className="input" placeholder="Slug (để trống = tự tạo)" value={pForm.slug || ''} onChange={(e) => setPForm({ ...pForm, slug: e.target.value })} />
            <div>
              <p className="mb-1 text-sm text-ink-500">Nội dung</p>
              <TipTapEditor value={pForm.content || ''} onChange={(html) => setPForm({ ...pForm, content: html })} placeholder="Soạn nội dung trang…" />
            </div>
            <input type="number" className="input w-28" placeholder="Thứ tự" value={pForm.sortOrder ?? 0} onChange={(e) => setPForm({ ...pForm, sortOrder: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!pForm.isPublished} onChange={(e) => setPForm({ ...pForm, isPublished: e.target.checked })} /> Hiển thị công khai</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!pForm.showInNav} onChange={(e) => setPForm({ ...pForm, showInNav: e.target.checked })} /> Hiện trên menu</label>
            <div className="flex gap-2">
              <button onClick={savePage} className="btn-primary !py-1.5 text-sm">{pForm.id ? 'Cập nhật' : 'Tạo'}</button>
              {pForm.id && <button onClick={() => setPForm(EMPTY_PAGE)} className="btn-outline !py-1.5 text-sm">Huỷ</button>}
            </div>
          </div>
        </div>
      )}

      {tab === 'links' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l.id} className="card flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.label}</div>
                  <div className="truncate text-xs text-ink-500">{l.url} {l.isActive ? '' : '· (ẩn)'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLForm(l)} className="btn-outline !py-1 text-xs">Sửa</button>
                  <button onClick={() => delLink(l.id)} className="btn-outline !py-1 text-xs text-red-600">Xoá</button>
                </div>
              </div>
            ))}
            {links.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có liên kết nào.</div>}
          </div>
          <div className="card space-y-2 p-4">
            <h2 className="font-semibold">{lForm.id ? 'Sửa liên kết' : 'Tạo liên kết'}</h2>
            <input className="input" placeholder="Nhãn" value={lForm.label || ''} onChange={(e) => setLForm({ ...lForm, label: e.target.value })} />
            <input className="input" placeholder="URL (vd /p?slug=rules hoặc https://…)" value={lForm.url || ''} onChange={(e) => setLForm({ ...lForm, url: e.target.value })} />
            <input type="number" className="input w-28" placeholder="Thứ tự" value={lForm.sortOrder ?? 0} onChange={(e) => setLForm({ ...lForm, sortOrder: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!lForm.openNewTab} onChange={(e) => setLForm({ ...lForm, openNewTab: e.target.checked })} /> Mở tab mới</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!lForm.isActive} onChange={(e) => setLForm({ ...lForm, isActive: e.target.checked })} /> Đang bật</label>
            <div className="flex gap-2">
              <button onClick={saveLink} className="btn-primary !py-1.5 text-sm">{lForm.id ? 'Cập nhật' : 'Tạo'}</button>
              {lForm.id && <button onClick={() => setLForm(EMPTY_LINK)} className="btn-outline !py-1.5 text-sm">Huỷ</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
