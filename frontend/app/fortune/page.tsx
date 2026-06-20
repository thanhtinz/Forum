'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Moon, Coins, Bot, Star } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'tarot' | 'zodiac';
interface Cfg { priceBazi: number; priceTarot: number; priceMeihua: number; aiEnabled: boolean; aiPrice: number; }

export default function FortunePage() {
  const [tab, setTab] = useState<Tab>('tarot');
  const [cfg, setCfg] = useState<Cfg | null>(null);
  useEffect(() => { api.get<Cfg>('/fortune/config').then(setCfg).catch(() => {}); }, []);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles /> Tarot & Cung Hoàng Đạo</h1>
        <p className="text-white/85">Bốc bài Tarot theo chủ đề · Tử vi 12 cung hoàng đạo {cfg?.aiEnabled && '· có luận giải AI'}</p>
      </header>

      <div className="flex gap-2">
        {([['tarot', 'Tarot', Moon, cfg?.priceTarot], ['zodiac', 'Cung hoàng đạo', Star, 0]] as const).map(([id, label, Icon, price]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            <Icon size={16} /> {label}{price ? <span className="ml-1 flex items-center gap-0.5 text-xs opacity-80"><Coins size={11} />{price}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'tarot' && <Tarot ai={cfg?.aiEnabled} aiPrice={cfg?.aiPrice} />}
      {tab === 'zodiac' && <Zodiac ai={cfg?.aiEnabled} aiPrice={cfg?.aiPrice} />}
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

const TAROT_TOPICS: [string, string][] = [
  ['general', '🔮 Tổng quát'], ['love', '❤️ Tình duyên'], ['career', '💼 Sự nghiệp'],
  ['money', '💰 Tài chính'], ['health', '🌿 Sức khỏe'], ['study', '📚 Học tập'], ['decision', '⚖️ Quyết định'],
];

const TAROT_SPREADS: Record<number, { name: string; desc: string; positions: string[] }> = {
  1: { name: 'Một lá', desc: 'Thông điệp nhanh cho hôm nay hoặc một câu hỏi.', positions: ['Thông điệp'] },
  3: { name: 'Ba lá', desc: 'Dòng chảy thời gian của vấn đề.', positions: ['Quá khứ', 'Hiện tại', 'Tương lai'] },
  5: { name: 'Năm lá', desc: 'Phân tích sâu một tình huống.', positions: ['Tình huống', 'Thử thách', 'Lời khuyên', 'Nền tảng', 'Kết quả'] },
};

function Tarot({ ai, aiPrice }: { ai?: boolean; aiPrice?: number }) {
  const [n, setN] = useState(3);
  const [topic, setTopic] = useState('general');
  const [q, setQ] = useState('');
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function go() {
    setErr(''); setLoading(true);
    const topicLabel = TAROT_TOPICS.find(([k]) => k === topic)?.[1]?.replace(/^\S+\s/, '') || '';
    const question = q.trim() || topicLabel; // nếu không nhập câu hỏi, lấy chủ đề làm bối cảnh
    try { setR(await api.post('/fortune/tarot', { n, question, topic })); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  const spread = TAROT_SPREADS[n] || TAROT_SPREADS[3];

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">Chọn chủ đề</p>
          <div className="flex flex-wrap gap-1.5">
            {TAROT_TOPICS.map(([k, label]) => (
              <button key={k} onClick={() => setTopic(k)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${topic === k ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
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

function Stars({ n }: { n: number }) {
  return <span className="text-amber-400">{'★'.repeat(n)}<span className="text-ink-300 dark:text-ink-600">{'★'.repeat(5 - n)}</span></span>;
}

function Zodiac({ ai, aiPrice }: { ai?: boolean; aiPrice?: number }) {
  const [list, setList] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get<any[]>('/fortune/zodiac/list').then(setList).catch(() => {}); }, []);

  async function load(params: string) {
    setErr(''); setBusy(true);
    try { setR(await api.get<any>(`/fortune/zodiac?${params}`)); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <p className="text-sm font-medium">Chọn cung của bạn</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((z) => (
            <button key={z.key} onClick={() => load(`sign=${z.key}`)}
              className={`flex flex-col items-center rounded-xl border-2 p-2 transition ${r?.sign?.key === z.key ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-transparent bg-ink-100 hover:border-brand-300 dark:bg-ink-800'}`}>
              <span className="text-2xl">{z.symbol}</span>
              <span className="text-xs font-semibold">{z.nameVi}</span>
              <span className="text-[10px] text-ink-400">{z.dateRange}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
          <label className="text-sm">Hoặc nhập ngày sinh<input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <button onClick={() => date && load(`date=${date}`)} disabled={busy} className="btn-outline">Xem theo ngày sinh</button>
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>

      {r && (
        <div className="space-y-4">
          {/* Hồ sơ cung */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{r.sign.symbol}</span>
              <div>
                <h3 className="text-xl font-bold">{r.sign.nameVi} <span className="text-sm font-normal text-ink-400">({r.sign.nameEn})</span></h3>
                <p className="text-sm text-ink-500">{r.sign.dateRange} · {r.sign.element} · {r.sign.planet}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{r.sign.overview}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Info label="Tính cách" value={r.sign.traits.join(', ')} />
              <Info label="Hợp với" value={r.sign.compatible.join(', ')} />
              <Info label="Điểm mạnh" value={r.sign.strengths.join(', ')} />
              <Info label="Điểm yếu" value={r.sign.weaknesses.join(', ')} />
              <Info label="Màu may mắn" value={r.sign.luckyColor} />
              <Info label="Ngày may mắn" value={r.sign.luckyDay} />
            </div>
          </div>

          {/* Tử vi hôm nay */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Tử vi hôm nay</h3>
              <span className="text-xs text-ink-400">{r.daily.date} · Tâm trạng: <b>{r.daily.mood}</b> · Số may mắn: <b className="text-brand-600">{r.daily.luckyNumber}</b></span>
            </div>
            <div className="space-y-2.5">
              {([['❤️ Tình duyên', r.daily.love], ['💼 Sự nghiệp', r.daily.career], ['💰 Tài chính', r.daily.money], ['🌿 Sức khỏe', r.daily.health]] as const).map(([label, a]) => (
                <div key={label} className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-800/50">
                  <div className="flex items-center justify-between text-sm font-medium"><span>{label}</span><Stars n={a.star} /></div>
                  <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{a.text}</p>
                </div>
              ))}
            </div>
            <AiAnalyze type="ZODIAC" result={r} question={`Tử vi cung ${r.sign.nameVi}`} enabled={ai} price={aiPrice} />
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-ink-50 px-3 py-1.5 text-sm dark:bg-ink-800/50"><span className="text-ink-500">{label}: </span><span className="font-medium">{value}</span></div>;
}
