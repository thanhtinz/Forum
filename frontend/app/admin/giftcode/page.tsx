'use client';

import { useEffect, useState } from 'react';
import { Gift, Plus, Trash2, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Reward { type: string; amount?: number; refId?: string }
interface GiftCode {
  id: string; code: string; rewards: Reward[]; maxUses: number; usedCount: number;
  perUserLimit: number; expiresAt?: string | null; isActive: boolean; note?: string | null;
  _count?: { redemptions: number };
}
interface Opt { id: string; name: string }

const TYPES: { v: string; label: string; needRef: boolean; needAmount: boolean }[] = [
  { v: 'coin', label: 'Xu (coin)', needRef: false, needAmount: true },
  { v: 'gem', label: 'Gem', needRef: false, needAmount: true },
  { v: 'badge', label: 'Huy hiệu', needRef: true, needAmount: false },
  { v: 'item', label: 'Vật phẩm', needRef: true, needAmount: true },
  { v: 'special', label: 'Vật phẩm đặc biệt', needRef: true, needAmount: true },
  { v: 'sticker', label: 'Gói sticker', needRef: true, needAmount: false },
];

export default function AdminGiftcode() {
  const [list, setList] = useState<GiftCode[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  // form
  const [code, setCode] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([{ type: 'coin', amount: 100 }]);
  const [maxUses, setMaxUses] = useState(0);
  const [perUserLimit, setPerUserLimit] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  // catalogs
  const [badges, setBadges] = useState<Opt[]>([]);
  const [items, setItems] = useState<Opt[]>([]);
  const [specials, setSpecials] = useState<Opt[]>([]);
  const [stickers, setStickers] = useState<Opt[]>([]);

  function load() { api.get<GiftCode[]>('/giftcode/admin').then(setList).catch((e) => setErr(e.message)); }
  useEffect(() => {
    load();
    api.get<any[]>('/badges/catalog').then((r) => setBadges(r.map((b) => ({ id: b.id, name: b.name })))).catch(() => {});
    api.get<any[]>('/admin/shop/equipment').then((r) => setItems(r.map((i) => ({ id: i.id, name: i.name })))).catch(() => {});
    api.get<any[]>('/admin/shop/special').then((r) => setSpecials(r.map((i) => ({ id: i.id, name: i.name })))).catch(() => {});
    api.get<any[]>('/admin/stickers').then((r) => setStickers(r.map((p) => ({ id: p.id, name: p.name })))).catch(() => {});
  }, []);

  function optsFor(type: string): Opt[] {
    return type === 'badge' ? badges : type === 'item' ? items : type === 'special' ? specials : type === 'sticker' ? stickers : [];
  }
  const meta = (t: string) => TYPES.find((x) => x.v === t)!;

  function setReward(i: number, patch: Partial<Reward>) {
    setRewards((rs) => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addReward() { setRewards((rs) => [...rs, { type: 'coin', amount: 100 }]); }
  function delReward(i: number) { setRewards((rs) => rs.filter((_, idx) => idx !== i)); }

  async function create() {
    setErr(''); setMsg('');
    try {
      await api.post('/giftcode/admin', {
        code: code.trim() || undefined,
        rewards: rewards.map((r) => ({ type: r.type, amount: meta(r.type).needAmount ? Number(r.amount) || 1 : undefined, refId: meta(r.type).needRef ? r.refId : undefined })),
        maxUses: Number(maxUses) || 0,
        perUserLimit: Number(perUserLimit) || 1,
        expiresAt: expiresAt || null,
        note: note || undefined,
      });
      setMsg('Đã tạo giftcode ✓');
      setCode(''); setRewards([{ type: 'coin', amount: 100 }]); setMaxUses(0); setPerUserLimit(1); setExpiresAt(''); setNote('');
      load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(g: GiftCode) { await api.post(`/giftcode/admin/${g.id}/toggle`).catch(() => {}); load(); }
  async function remove(g: GiftCode) { if (!confirm(`Xoá mã "${g.code}"?`)) return; await api.del(`/giftcode/admin/${g.id}`).catch(() => {}); load(); }

  function rewardLabel(r: Reward): string {
    const m = meta(r.type);
    if (!m.needRef) return `${r.amount?.toLocaleString()} ${r.type === 'coin' ? 'Xu' : 'Gem'}`;
    const name = optsFor(r.type).find((o) => o.id === r.refId)?.name || r.refId || '?';
    return `${m.label}: ${name}${m.needAmount && (r.amount ?? 1) > 1 ? ` ×${r.amount}` : ''}`;
  }

  return (
    <div className="space-y-5">
      <PageHeader icon={<Gift size={20} />} title="Giftcode" desc="Tạo mã quà tặng — cộng Xu, Gem, huy hiệu, vật phẩm, gói sticker… cho người nhập mã." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Tạo mã */}
      <Card className="space-y-4">
        <SectionTitle hint="Để trống mã = tự sinh ngẫu nhiên.">Tạo giftcode mới</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Mã (tuỳ chọn)" className="sm:col-span-2"><input className="input font-mono uppercase" placeholder="VD: TET2026 (trống = tự sinh)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field>
          <Field label="Tổng lượt (0 = vô hạn)"><input type="number" min={0} className="input" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} /></Field>
          <Field label="Mỗi user dùng"><input type="number" min={1} className="input" value={perUserLimit} onChange={(e) => setPerUserLimit(Number(e.target.value))} /></Field>
          <Field label="Hết hạn (tuỳ chọn)" className="sm:col-span-2"><input type="datetime-local" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
          <Field label="Ghi chú" className="sm:col-span-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>

        {/* Phần thưởng */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Phần thưởng</p>
          <div className="space-y-2">
            {rewards.map((r, i) => {
              const m = meta(r.type);
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200/70 p-2 dark:border-ink-700">
                  <select className="input !w-auto" value={r.type} onChange={(e) => setReward(i, { type: e.target.value, refId: undefined, amount: meta(e.target.value).needAmount ? (r.amount || 1) : undefined })}>
                    {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                  {m.needRef && (
                    <select className="input !w-auto flex-1" value={r.refId || ''} onChange={(e) => setReward(i, { refId: e.target.value })}>
                      <option value="">— Chọn —</option>
                      {optsFor(r.type).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                  {m.needAmount && (
                    <input type="number" min={1} className="input w-28" placeholder="Số lượng" value={r.amount ?? 1} onChange={(e) => setReward(i, { amount: Number(e.target.value) })} />
                  )}
                  <button onClick={() => delReward(i)} className="ml-auto text-rose-500 hover:text-rose-600"><Trash2 size={16} /></button>
                </div>
              );
            })}
          </div>
          <Btn variant="outline" size="sm" className="mt-2" onClick={addReward}><Plus size={14} /> Thêm phần thưởng</Btn>
        </div>

        <Btn onClick={create}>Tạo giftcode</Btn>
      </Card>

      {/* Danh sách */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Mã đã tạo ({list.length})</h2>
        {list.length === 0 && <Card><Empty icon={<Gift size={28} />} title="Chưa có giftcode nào" /></Card>}
        {list.map((g) => (
          <Card key={g.id} className={!g.isActive ? 'opacity-60' : ''}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-base font-bold tracking-wider">{g.code}</span>
                {!g.isActive && <span className="ml-2 rounded bg-ink-200 px-1.5 py-0.5 text-[10px] text-ink-500 dark:bg-ink-700">Tắt</span>}
                {g.expiresAt && <span className="ml-2 text-xs text-ink-400">HSD {new Date(g.expiresAt).toLocaleString('vi-VN')}</span>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(g.rewards || []).map((r, i) => (
                    <span key={i} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">🎁 {rewardLabel(r)}</span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-ink-400">Đã dùng {g.usedCount}{g.maxUses > 0 ? `/${g.maxUses}` : ''} · mỗi user {g.perUserLimit} lần{g.note ? ` · ${g.note}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" size="sm" onClick={() => toggle(g)} title={g.isActive ? 'Tắt' : 'Bật'}><Power size={14} /> {g.isActive ? 'Tắt' : 'Bật'}</Btn>
                <Btn variant="danger" size="sm" onClick={() => remove(g)}><Trash2 size={14} /></Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
