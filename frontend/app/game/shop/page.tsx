'use client';

import { useEffect, useState } from 'react';
import { Sword, Backpack, Coins, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const RARITY: Record<string, string> = { COMMON: 'text-ink-500', RARE: 'text-sky-600', EPIC: 'text-fuchsia-600', LEGENDARY: 'text-amber-600' };

export default function ShopPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'shop' | 'bag'>('shop');
  const [items, setItems] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  function load() {
    api.get<any[]>('/game/shop').then(setItems).catch((e) => setMsg(e.message));
    api.get<any[]>('/game/inventory').then(setInv).catch(() => {});
  }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);
  const act = async (fn: () => Promise<any>) => { try { await fn(); setMsg('OK'); } catch (e: any) { setMsg(e.message); } load(); };

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào cửa hàng.</div>;

  function bonuses(t: any) {
    return [t.bonusStr && `+${t.bonusStr} SM`, t.bonusVit && `+${t.bonusVit} TL`, t.bonusAgi && `+${t.bonusAgi} NN`, t.bonusInt && `+${t.bonusInt} TT`, t.bonusAtk && `+${t.bonusAtk} ATK`, t.bonusDef && `+${t.bonusDef} DEF`, t.bonusHp && `+${t.bonusHp} HP`].filter(Boolean).join(', ');
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 to-orange-600 p-6 text-white shadow-card">
        <Sword /> <h1 className="text-2xl font-bold">Cửa hàng trang bị</h1>
      </header>
      <div className="flex gap-2">
        <button onClick={() => setTab('shop')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${tab === 'shop' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}><Sword size={16} /> Cửa hàng</button>
        <button onClick={() => setTab('bag')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${tab === 'bag' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}><Backpack size={16} /> Túi đồ ({inv.length})</button>
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {tab === 'shop' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${RARITY[it.rarity] || ''}`}>{it.name}</span>
                <span className="text-xs text-ink-400">{it.slot} · Lv{it.reqLevel}</span>
              </div>
              <p className="mt-1 text-xs text-brand-600">{bonuses(it)}</p>
              <div className="mt-3 flex gap-2">
                {it.priceCoin != null && <button onClick={() => act(() => api.post('/game/shop/buy', { templateId: it.id, currency: 'COIN', quantity: 1 }))} className="btn-outline flex-1 !py-1 text-xs"><Coins size={12} /> {it.priceCoin}</button>}
                {it.priceGem != null && <button onClick={() => act(() => api.post('/game/shop/buy', { templateId: it.id, currency: 'GEM', quantity: 1 }))} className="btn-outline flex-1 !py-1 text-xs"><Gem size={12} /> {it.priceGem}</button>}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-ink-500">Cửa hàng trống.</p>}
        </div>
      )}

      {tab === 'bag' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inv.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${RARITY[i.template?.rarity] || ''}`}>{i.template?.name} {i.enhanceLevel ? `+${i.enhanceLevel}` : ''}</span>
                <span className="text-xs text-ink-400">{i.template?.slot}</span>
              </div>
              <p className="mt-1 text-xs text-brand-600">{bonuses(i.template || {})}</p>
              <div className="mt-3 flex gap-2">
                {i.equipped
                  ? <button onClick={() => act(() => api.post('/game/unequip', { slot: i.template?.slot }))} className="btn-outline flex-1 !py-1 text-xs">Tháo</button>
                  : <button onClick={() => act(() => api.post('/game/equip', { inventoryItemId: i.id }))} className="btn-primary flex-1 !py-1 text-xs">Trang bị</button>}
                <button onClick={() => act(() => api.post('/game/shop/enhance', { inventoryItemId: i.id }))} className="btn-outline flex-1 !py-1 text-xs">Cường hóa</button>
              </div>
            </div>
          ))}
          {inv.length === 0 && <p className="col-span-full text-center text-ink-500">Túi đồ trống.</p>}
        </div>
      )}
    </div>
  );
}
