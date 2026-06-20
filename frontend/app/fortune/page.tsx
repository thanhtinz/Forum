'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Moon, Hash, Coins, Bot } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'bazi' | 'tarot' | 'meihua';
interface Cfg { priceBazi: number; priceTarot: number; priceMeihua: number; aiEnabled: boolean; aiPrice: number; }

export default function FortunePage() {
  const [tab, setTab] = useState<Tab>('bazi');
  const [cfg, setCfg] = useState<Cfg | null>(null);
  useEffect(() => { api.get<Cfg>('/fortune/config').then(setCfg).catch(() => {}); }, []);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles /> Bói toán & Tử vi</h1>
        <p className="text-white/85">Bát Tự · Tarot · Mai Hoa Dịch Số {cfg?.aiEnabled && '· có luận giải AI'}</p>
      </header>

      <div className="flex gap-2">
        {([['bazi', 'Bát Tự', Hash, cfg?.priceBazi], ['tarot', 'Tarot', Moon, cfg?.priceTarot], ['meihua', 'Mai Hoa', Sparkles, cfg?.priceMeihua]] as const).map(([id, label, Icon, price]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            <Icon size={16} /> {label}{price ? <span className="ml-1 flex items-center gap-0.5 text-xs opacity-80"><Coins size={11} />{price}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'bazi' && <Bazi ai={cfg?.aiEnabled} aiPrice={cfg?.aiPrice} />}
      {tab === 'tarot' && <Tarot ai={cfg?.aiEnabled} aiPrice={cfg?.aiPrice} />}
      {tab === 'meihua' && <Meihua ai={cfg?.aiEnabled} aiPrice={cfg?.aiPrice} />}
    </div>
  );
}

function AiAnalyze({ type, result, question, enabled, price }: { type: string; result: any; question?: string; enabled?: boolean; price?: number }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!enabled) return null;
  async function go() {
    setBusy(true); setErr('');
    try { const r = await api.post<{ analysis: string }>('/fortune/analyze', { type, result, question }); setText(r.analysis); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="mt-4 border-t border-ink-200/70 pt-3 dark:border-ink-800">
      {!text && (
        <button onClick={go} disabled={busy} className="btn-outline">
          <Bot size={16} /> {busy ? 'AI đang luận giải…' : `Luận giải bằng AI${price ? ` (${price} coin)` : ''}`}
        </button>
      )}
      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      {text && <div className="prose prose-sm mt-2 max-w-none whitespace-pre-wrap rounded-lg bg-violet-50 p-3 dark:bg-ink-900">{text}</div>}
    </div>
  );
}

function Bazi({ ai, aiPrice }: { ai?: boolean; aiPrice?: number }) {
  const [f, setF] = useState({ year: 1995, month: 8, day: 15, hour: 10, minute: 0 });
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const num = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: Number(e.target.value) });
  async function go() { setBusy(true); setErr(''); try { setR(await api.post('/fortune/bazi', f)); } catch (e: any) { setErr(e.message); } setBusy(false); }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Ngày giờ sinh (dương lịch)</h2>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Năm<input className="input mt-1" type="number" value={f.year} onChange={num('year')} /></label>
          <label className="text-xs">Tháng<input className="input mt-1" type="number" value={f.month} onChange={num('month')} /></label>
          <label className="text-xs">Ngày<input className="input mt-1" type="number" value={f.day} onChange={num('day')} /></label>
          <label className="text-xs">Giờ<input className="input mt-1" type="number" value={f.hour} onChange={num('hour')} /></label>
          <label className="text-xs">Phút<input className="input mt-1" type="number" value={f.minute} onChange={num('minute')} /></label>
        </div>
        <button onClick={go} disabled={busy} className="btn-primary w-full">{busy ? '…' : 'Lập lá số'}</button>
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      {r && (
        <div className="card p-5">
          <p className="text-sm text-ink-500">{r.lunarDate} · Con giáp: {r.zodiac}</p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {(['year', 'month', 'day', 'hour'] as const).map((k) => (
              <div key={k} className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
                <div className="text-xs text-ink-500">{({ year: 'Năm', month: 'Tháng', day: 'Ngày', hour: 'Giờ' })[k]}</div>
                <div className="mt-1 text-lg font-bold">{r.pillars[k].ganZhi}</div>
                <div className="text-xs">{r.pillars[k].canChi}</div>
                <div className="mt-1 text-[11px] text-brand-600">{r.pillars[k].wuxing.join(' · ')}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm dark:bg-ink-900">
            <b>Ngũ hành:</b> {Object.entries(r.wuxingCount).map(([k, v]) => `${k} ${v}`).join(' · ')}
            <p className="mt-2 text-ink-600 dark:text-ink-300">{r.summary}</p>
          </div>
          <AiAnalyze type="BAZI" result={r} enabled={ai} price={aiPrice} />
        </div>
      )}
    </div>
  );
}

const TAROT_SPREADS: Record<number, { name: string; desc: string; positions: string[] }> = {
  1: { name: 'Một lá', desc: 'Thông điệp nhanh cho hôm nay hoặc một câu hỏi.', positions: ['Thông điệp'] },
  3: { name: 'Ba lá', desc: 'Dòng chảy thời gian của vấn đề.', positions: ['Quá khứ', 'Hiện tại', 'Tương lai'] },
  5: { name: 'Năm lá', desc: 'Phân tích sâu một tình huống.', positions: ['Tình huống', 'Thử thách', 'Lời khuyên', 'Nền tảng', 'Kết quả'] },
};

function Tarot({ ai, aiPrice }: { ai?: boolean; aiPrice?: number }) {
  const [n, setN] = useState(3);
  const [q, setQ] = useState('');
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function go() { setErr(''); setLoading(true); try { setR(await api.post('/fortune/tarot', { n, question: q })); } catch (e: any) { setErr(e.message); } finally { setLoading(false); } }

  const spread = TAROT_SPREADS[n] || TAROT_SPREADS[3];

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">Chọn trải bài</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 5].map((x) => (
              <button key={x} onClick={() => setN(x)}
                className={`rounded-xl border-2 p-2 text-center transition ${n === x ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-transparent bg-ink-100 dark:bg-ink-800'}`}>
                <div className="text-lg font-bold">{x}</div>
                <div className="text-[11px] text-ink-500">{TAROT_SPREADS[x].name}</div>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-400">{spread.desc} · Vị trí: {spread.positions.join(' · ')}</p>
        </div>
        <label className="block text-sm">Câu hỏi (tuỳ chọn)
          <input className="input mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: Tình duyên sắp tới của mình thế nào?" />
        </label>
        <button onClick={go} disabled={loading} className="btn-primary w-full">{loading ? 'Đang bốc bài…' : '🔮 Bốc bài'}</button>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      {r && (
        <div className="card space-y-4 p-5">
          <div className="text-center">
            <h3 className="text-lg font-bold">Trải bài {(TAROT_SPREADS[r.cards.length] || spread).name}</h3>
            {r.question && <p className="text-sm text-ink-500">“{r.question}”</p>}
          </div>
          <div className={`grid gap-4 ${r.cards.length === 1 ? 'grid-cols-1 sm:max-w-xs sm:mx-auto' : r.cards.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'}`}>
            {r.cards.map((c: any, i: number) => {
              const pos = (TAROT_SPREADS[r.cards.length]?.positions || [])[i];
              const rev = c.reversedOrientation;
              return (
                <div key={i} className="flex flex-col items-center text-center">
                  {pos && <div className="mb-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{pos}</div>}
                  <div className="overflow-hidden rounded-xl border border-ink-200/70 shadow-sm dark:border-ink-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt={c.nameVi} className={`w-full object-cover transition ${rev ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="mt-2 font-semibold leading-tight">{c.nameVi}</div>
                  <div className="text-[11px] text-ink-400">{c.name}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${rev ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                    {rev ? '⟳ Ngược' : '↑ Xuôi'}
                  </span>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    {c.meaning.map((m: string, k: number) => (
                      <span key={k} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">{m}</span>
                    ))}
                  </div>
                  {c.desc && <p className="mt-1.5 text-left text-xs leading-snug text-ink-500">{c.desc}</p>}
                  {c.advice && <p className="mt-1 text-left text-xs leading-snug text-brand-600">💡 {c.advice}</p>}
                </div>
              );
            })}
          </div>
          <div className="space-y-2 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">
            <p className="font-medium">🔮 Luận giải</p>
            <ul className="space-y-1.5 text-ink-600 dark:text-ink-300">
              {r.cards.map((c: any, i: number) => {
                const pos = (TAROT_SPREADS[r.cards.length]?.positions || [])[i];
                return (
                  <li key={i}>
                    <b>{pos ? `${pos} — ` : ''}{c.nameVi} ({c.reversedOrientation ? 'ngược' : 'xuôi'}):</b> {c.advice || c.meaning.join(', ')}
                  </li>
                );
              })}
            </ul>
          </div>
          <AiAnalyze type="TAROT" result={r} question={q} enabled={ai} price={aiPrice} />
        </div>
      )}
    </div>
  );
}

function Meihua({ ai, aiPrice }: { ai?: boolean; aiPrice?: number }) {
  const [f, setF] = useState({ num1: '', num2: '', question: '' });
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  async function go() {
    setErr('');
    try { setR(await api.post('/fortune/meihua', { num1: f.num1 ? Number(f.num1) : undefined, num2: f.num2 ? Number(f.num2) : undefined, question: f.question })); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Gieo quẻ</h2>
        <p className="text-xs text-ink-500">Nhập 2 số bất kỳ (để trống = dùng thời điểm hiện tại).</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder="Số 1" value={f.num1} onChange={(e) => setF({ ...f, num1: e.target.value })} />
          <input className="input" type="number" placeholder="Số 2" value={f.num2} onChange={(e) => setF({ ...f, num2: e.target.value })} />
        </div>
        <input className="input" placeholder="Câu hỏi (tuỳ chọn)" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
        <button onClick={go} className="btn-primary w-full">Lập quẻ</button>
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      {r && (
        <div className="card p-5 text-center">
          <div className="whitespace-pre text-4xl leading-tight">{r.hexagram.symbol}</div>
          <div className="mt-2 text-lg font-bold">{r.hexagram.name}</div>
          <div className="text-sm text-ink-500">Hào động: {r.movingLine}</div>
          <div className="mt-3 inline-block rounded-full bg-brand-100 px-4 py-1 font-semibold text-brand-700">{r.verdict}</div>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{r.analysis}</p>
          <div className="text-left"><AiAnalyze type="MEIHUA" result={r} question={f.question} enabled={ai} price={aiPrice} /></div>
        </div>
      )}
    </div>
  );
}
