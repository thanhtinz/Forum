'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShoppingBag, Gem, Loader2, ChevronLeft, Package, Ticket, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { gamePortal, ShopItem, ShopItemKind, GameCharacter } from '@/lib/gamePortal';
import { CharacterGate } from '@/components/game-portal/CharacterGate';

function ShopInner({ slug, character }: { slug: string; character: GameCharacter }) {
  const [kind, setKind] = useState<ShopItemKind>('item');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [q, setQ] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadBalance = useCallback(() => {
    api.get<{ balance: number }>('/gem/balance').then((r) => setBalance(r.balance)).catch(() => {});
  }, []);
  useEffect(() => { gamePortal.listShop(slug, kind).then(setItems).catch(() => setItems([])); }, [slug, kind]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  async function buy(item: ShopItem) {
    setBusy(item.id); setMsg(null);
    try {
      const r = await gamePortal.buy(slug, { itemId: item.id, kind, quantity: 1, serverId: character.serverId, identifier: character.name });
      setMsg({ ok: r.ok, text: r.message });
      loadBalance();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Mua thất bại' });
    } finally { setBusy(''); }
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setKind('item')} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${kind === 'item' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}><Ticket size={15} /> Vật Phẩm</button>
          <button onClick={() => setKind('bundle')} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${kind === 'bundle' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}><Package size={15} /> Gói Vật Phẩm</button>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-500">
          <Gem size={15} /> {balance ?? '...'}
        </span>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Tìm kiếm..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((it) => (
          <div key={it.id} className="card flex flex-col p-3">
            <div className="grid h-24 place-items-center rounded-lg bg-ink-100 dark:bg-ink-800">
              {it.iconUrl ? <img src={it.iconUrl} alt={it.name} className="h-20 object-contain" /> : <Package className="text-ink-400" size={32} />}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{it.name}</p>
            <p className="text-xs text-ink-400">{it.category || (it.kind === 'bundle' ? 'Gói Vật Phẩm' : 'Vật Phẩm')}</p>
            {it.contents && it.contents.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-ink-500">
                {it.contents.slice(0, 3).map((c, i) => <li key={i}>• {c.label}{c.qty ? ` x${c.qty}` : ''}</li>)}
              </ul>
            )}
            <div className="mt-auto pt-3">
              <button onClick={() => buy(it)} disabled={!!busy}
                className="btn-primary w-full !bg-amber-600 hover:!bg-amber-700 !py-1.5 text-sm">
                {busy === it.id ? <Loader2 size={15} className="animate-spin" /> : <><Gem size={14} /> {it.priceGem}</>}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center text-sm text-ink-400">Không có vật phẩm.</p>}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const slug = useParams().slug as string;
  return (
    <div className="space-y-4">
      <Link href={`/cong-game/${slug}`} className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Quay lại game</Link>
      <header className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-700 to-orange-600 p-6 text-white shadow-card">
        <ShoppingBag size={26} />
        <div>
          <h1 className="text-xl font-bold">Cửa hàng</h1>
          <p className="text-sm text-white/80">Mua vật phẩm gửi vào trò chơi — thanh toán bằng Gem</p>
        </div>
      </header>
      <CharacterGate slug={slug} intro="Xác minh nhân vật để vật phẩm được gửi đúng vào tài khoản game của bạn.">
        {(character) => <ShopInner slug={slug} character={character} />}
      </CharacterGate>
    </div>
  );
}
