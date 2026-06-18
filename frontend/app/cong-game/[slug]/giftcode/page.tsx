'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Gift, Loader2, ChevronLeft } from 'lucide-react';
import { gamePortal, GiftcodePublic, GameCharacter } from '@/lib/gamePortal';
import { CharacterGate } from '@/components/game-portal/CharacterGate';

function GiftcodeInner({ slug, character }: { slug: string; character: GameCharacter }) {
  const [codes, setCodes] = useState<GiftcodePublic[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { gamePortal.listGiftcodes(slug).then(setCodes).catch(() => {}); }, [slug]);

  async function redeem(code: string) {
    if (!code.trim()) return;
    setBusy(code); setMsg(null);
    try {
      const r = await gamePortal.redeem(slug, code.trim(), character.serverId, character.name);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) setInput('');
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Nhận thưởng thất bại' });
    } finally { setBusy(''); }
  }

  return (
    <div className="space-y-4">
      {/* Nhập mã */}
      <div className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-ink-300">Điền mã nhận thưởng vào đây</h3>
        <div className="flex gap-2">
          <input className="input flex-1 uppercase" placeholder="VIP888, VIP999..." value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && redeem(input)} />
          <button onClick={() => redeem(input)} disabled={!!busy} className="btn-primary shrink-0">
            {busy === input && busy ? <Loader2 size={16} className="animate-spin" /> : 'KIỂM TRA'}
          </button>
        </div>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
      </div>

      {/* Danh sách giftcode */}
      <div className="grid gap-3 sm:grid-cols-2">
        {codes.map((c) => (
          <div key={c.code} className="card p-4">
            <p className="text-center text-lg font-bold tracking-wide">{c.code}</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-500">
              {c.rewards.map((r, i) => <li key={i} className="flex justify-between"><span>{r.label}</span>{r.qty && <span className="text-brand-500">x{r.qty}</span>}</li>)}
            </ul>
            <p className="mt-1 text-center text-xs text-ink-400">{c.totalItems ?? c.rewards.length} vật phẩm</p>
            <button onClick={() => redeem(c.code)} disabled={!!busy} className="btn-primary mt-3 w-full">
              {busy === c.code ? <Loader2 size={16} className="animate-spin" /> : 'Nhận Ngay'}
            </button>
          </div>
        ))}
        {codes.length === 0 && <p className="col-span-full text-center text-sm text-ink-400">Chưa có giftcode.</p>}
      </div>
    </div>
  );
}

export default function GiftcodePage() {
  const slug = useParams().slug as string;
  return (
    <div className="space-y-4">
      <Link href={`/cong-game/${slug}`} className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Quay lại game</Link>
      <header className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-700 to-fuchsia-700 p-6 text-white shadow-card">
        <Gift size={26} />
        <div>
          <h1 className="text-xl font-bold">Giftcode</h1>
          <p className="text-sm text-white/80">Nhập mã quà tặng và nhận thưởng</p>
        </div>
      </header>
      <CharacterGate slug={slug} intro="Xác minh nhân vật để nhận quà đúng vào tài khoản game của bạn.">
        {(character) => <GiftcodeInner slug={slug} character={character} />}
      </CharacterGate>
    </div>
  );
}
