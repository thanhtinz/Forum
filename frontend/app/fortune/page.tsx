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
        {([['tarot', 'Tarot', Moon, 0], ['zodiac', 'Cung hoàng đạo', Star, 0]] as const).map(([id, label, Icon, price]) => (
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
  ['love', '❤️ Tình duyên'], ['career', '💼 Sự nghiệp'], ['money', '💰 Tài chính'],
  ['health', '🌿 Sức khỏe'], ['study', '📚 Học tập'], ['decision', '⚖️ Quyết định'], ['general', '🔮 Tổng quát'],
];

const TAROT_SPREADS: Record<number, { name: string; desc: string; positions: string[] }> = {
  1: { name: 'Một lá', desc: 'Thông điệp nhanh cho hôm nay hoặc một câu hỏi.', positions: ['Thông điệp'] },
  3: { name: 'Ba lá', desc: 'Dòng chảy thời gian của vấn đề.', positions: ['Quá khứ', 'Hiện tại', 'Tương lai'] },
};

// Mặt sau lá bài (không cần ảnh) — dùng cho hiệu ứng xào & chọn bài
function CardBack({ className = '', picked = false }: { className?: string; picked?: boolean }) {
  return (
    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg border shadow-md ${picked ? 'border-amber-400 ring-2 ring-amber-300' : 'border-violet-300/40'} ${className}`}
      style={{ background: 'radial-gradient(circle at 30% 20%, #7c3aed 0%, #4c1d95 55%, #2e1065 100%)' }}>
      <div className="absolute inset-1 rounded-md border border-violet-300/40" />
      <div className="absolute inset-0 grid place-items-center text-2xl text-violet-100/80">✦</div>
    </div>
  );
}

type Step = 'mode' | 'spread' | 'input' | 'shuffle' | 'result';
const FAN = 9; // số lá úp cho user chọn

function Tarot({ ai, aiPrice }: { ai?: boolean; aiPrice?: number }) {
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<'question' | 'topic'>('question');
  const [n, setN] = useState(3);
  const [topic, setTopic] = useState('love');
  const [q, setQ] = useState('');
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  function reset() {
    setStep('mode'); setMode('question'); setN(3); setTopic('love'); setQ('');
    setR(null); setErr(''); setLoading(false); setShuffling(false); setPicked([]);
  }

  // Vào bước xào bài: chạy hiệu ứng xào rồi gọi API lấy bài thật (ẩn cho tới khi xem kết quả)
  async function startShuffle() {
    setErr(''); setPicked([]); setR(null); setStep('shuffle'); setShuffling(true);
    const topicLabel = TAROT_TOPICS.find(([k]) => k === topic)?.[1]?.replace(/^\S+\s/, '') || '';
    const question = mode === 'question' ? q.trim() : topicLabel;
    setLoading(true);
    try {
      const res = await api.post('/fortune/tarot', { n, question, topic: mode === 'topic' ? topic : undefined });
      setR(res);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
    setTimeout(() => setShuffling(false), 1300); // thời lượng hiệu ứng xào
  }

  function pick(i: number) {
    if (picked.includes(i)) { setPicked((p) => p.filter((x) => x !== i)); return; }
    if (picked.length >= n) return;
    setPicked((p) => [...p, i]);
  }

  const spread = TAROT_SPREADS[n] || TAROT_SPREADS[3];
  const topicLabel = TAROT_TOPICS.find(([k]) => k === topic)?.[1] || '';

  return (
    <div className="space-y-4">
      {/* Thanh tiến trình */}
      {step !== 'mode' && (
        <button onClick={reset} className="text-sm text-brand-600 hover:underline">← Bói lại từ đầu</button>
      )}

      {/* BƯỚC 1 — chọn hình thức bói */}
      {step === 'mode' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['question', 'Bói Theo Câu Hỏi', '🗝️', 'Nhập câu hỏi riêng của bạn để xem Tarot giải đáp chi tiết. Phù hợp khi bạn muốn bói Tarot theo câu hỏi cụ thể về tình yêu, công việc, tài chính hoặc tương lai gần.'],
            ['topic', 'Bói Theo Chủ Đề', '🎯', 'Chọn một chủ đề có sẵn để nhận thông điệp nhanh và chính xác. Hình thức bói Tarot theo chủ đề giúp bạn định hướng rõ hơn khi chưa biết phải hỏi gì.'],
          ] as const).map(([m, title, icon, desc]) => (
            <button key={m} onClick={() => { setMode(m); setStep('spread'); }}
              className="card flex flex-col p-5 text-left transition hover:border-brand-400 hover:shadow-card">
              <span className="text-3xl">{icon}</span>
              <span className="mt-2 text-base font-bold">{title}</span>
              <span className="mt-1 text-sm text-ink-500 dark:text-ink-400">{desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* BƯỚC 2 — chọn kiểu trải bài */}
      {step === 'spread' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Chọn kiểu trải bài</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              [1, 'Trải 1 Lá Bài', 'Nhanh — trực tiếp — chính xác. Dành cho khi bạn cần câu trả lời nhanh hoặc lời khuyên tức thời về tình yêu, công việc, sức khỏe hoặc quyết định nhỏ.'],
              [3, 'Trải 3 Lá Bài', 'Phân tích chiều sâu: quá khứ — hiện tại — tương lai hoặc tình huống — thử thách — lời khuyên. Phù hợp khi bạn cần nhìn rõ bức tranh tổng thể và giải thích chi tiết.'],
            ] as const).map(([x, title, desc]) => (
              <button key={x} onClick={() => { setN(x); setStep('input'); }}
                className="card flex flex-col p-5 text-left transition hover:border-brand-400 hover:shadow-card">
                <span className="text-2xl font-extrabold text-brand-600">{x} lá</span>
                <span className="mt-1 text-base font-bold">{title}</span>
                <span className="mt-1 text-sm text-ink-500 dark:text-ink-400">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BƯỚC 3 — nhập câu hỏi / chọn chủ đề rồi xào bài */}
      {step === 'input' && (
        <div className="card space-y-3 p-4">
          {mode === 'question' ? (
            <label className="block text-sm font-medium">Nhập câu hỏi của bạn
              <textarea className="input mt-1 min-h-[72px]" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="VD: Tình duyên sắp tới của mình sẽ thế nào?" />
            </label>
          ) : (
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
          )}
          <p className="text-xs text-ink-400">{spread.name} · {spread.desc}</p>
          <button onClick={startShuffle} disabled={mode === 'question' && !q.trim()}
            className="btn-primary w-full disabled:opacity-50">🔀 Xào bài</button>
        </div>
      )}

      {err && <p className="text-sm text-red-500">{err}</p>}

      {/* BƯỚC 4 — xào bài + chọn lá */}
      {step === 'shuffle' && (
        <div className="card space-y-4 p-5">
          {shuffling ? (
            <div className="flex flex-col items-center py-8">
              <div className="relative h-40 w-28">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="absolute left-1/2 top-0 w-24 -translate-x-1/2 animate-pulse"
                    style={{ animationDelay: `${i * 120}ms`, transform: `translateX(-50%) rotate(${(i - 2) * 8}deg) translateY(${i * 2}px)` }}>
                    <CardBack />
                  </div>
                ))}
              </div>
              <p className="mt-4 animate-pulse text-sm font-medium text-brand-600">Đang xào bài…</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h3 className="text-base font-bold">Chọn {n} lá bài</h3>
                <p className="text-sm text-ink-500">Tập trung vào điều bạn muốn hỏi rồi chọn {n} lá ({picked.length}/{n})</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: FAN }).map((_, i) => {
                  const isPicked = picked.includes(i);
                  return (
                    <button key={i} onClick={() => pick(i)}
                      className={`w-16 transition-transform sm:w-20 ${isPicked ? '-translate-y-3' : 'hover:-translate-y-1.5'}`}>
                      <CardBack picked={isPicked} />
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setStep('result')} disabled={picked.length !== n || loading || !r}
                className="btn-primary w-full disabled:opacity-50">
                {loading ? 'Đang chuẩn bị…' : '🔮 Xem kết quả'}
              </button>
            </>
          )}
        </div>
      )}

      {/* BƯỚC 5 — kết quả */}
      {step === 'result' && r && (
        <TarotResult r={r} mode={mode} topicLabel={topicLabel} ai={ai} aiPrice={aiPrice} q={q} />
      )}
    </div>
  );
}

function TarotResult({ r, mode, topicLabel, ai, aiPrice, q }: { r: any; mode: 'question' | 'topic'; topicLabel: string; ai?: boolean; aiPrice?: number; q: string }) {
  const cards: any[] = r.cards;
  const positions = TAROT_SPREADS[cards.length]?.positions || [];
  const ctx = mode === 'question' ? `“${r.question}”` : topicLabel;

  // Tổng hợp thông điệp & lời khuyên chung từ các lá
  const overallMessage = cards.map((c) => c.meaning?.join(', ')).filter(Boolean).join(' · ');
  const overallAdvice = cards.map((c) => c.advice).filter(Boolean).join(' ');
  const reversedCount = cards.filter((c) => c.reversedOrientation).length;
  const overallOverview = `Trải bài ${TAROT_SPREADS[cards.length]?.name || ''} cho ${mode === 'question' ? 'câu hỏi của bạn' : `chủ đề ${topicLabel}`}: `
    + cards.map((c, i) => `${positions[i] ? positions[i] + ' là ' : ''}${c.nameVi} (${c.reversedOrientation ? 'ngược' : 'xuôi'})`).join(', ') + '. '
    + (reversedCount === 0 ? 'Năng lượng tổng thể thuận lợi, bạn đang đi đúng hướng.'
      : reversedCount === cards.length ? 'Có nhiều lá ngược — hãy chậm lại, nhìn vào nội tâm trước khi hành động.'
      : 'Năng lượng pha trộn giữa thuận và nghịch — cần cân nhắc kỹ trước mỗi quyết định.');

  return (
    <div className="card space-y-5 p-5">
      {/* Tổng quan */}
      <div className="text-center">
        <h3 className="text-lg font-bold">Kết quả · Trải bài {TAROT_SPREADS[cards.length]?.name}</h3>
        {ctx && <p className="text-sm text-ink-500">{ctx}</p>}
      </div>

      {/* Các lá bài */}
      <div className={`grid gap-4 ${cards.length === 1 ? 'mx-auto grid-cols-1 sm:max-w-xs' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {cards.map((c, i) => {
          const pos = positions[i];
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
            </div>
          );
        })}
      </div>

      {/* Thông điệp từng lá */}
      <div className="space-y-2">
        <p className="text-sm font-bold">📜 Thông điệp từng lá</p>
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">
            <p className="font-semibold">{positions[i] ? `${positions[i]} — ` : ''}{c.nameVi} ({c.reversedOrientation ? 'ngược' : 'xuôi'})</p>
            {c.desc && <p className="mt-1 text-ink-600 dark:text-ink-300">{c.desc}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {c.meaning?.map((m: string, k: number) => (
                <span key={k} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600 dark:bg-ink-700 dark:text-ink-300">{m}</span>
              ))}
            </div>
            {c.advice && <p className="mt-1.5 text-brand-600">💡 {c.advice}</p>}
          </div>
        ))}
      </div>

      {/* Tổng quan chung */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm dark:border-ink-700 dark:bg-ink-800/50">
        <p className="font-bold text-violet-700 dark:text-violet-300">🌌 Tổng quan chung</p>
        <p className="mt-1 text-ink-700 dark:text-ink-200">{overallOverview}</p>
      </div>

      {/* Thông điệp chung */}
      <div className="rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">
        <p className="font-bold">💬 Thông điệp chung</p>
        <p className="mt-1 text-ink-600 dark:text-ink-300">{overallMessage}</p>
      </div>

      {/* Lời khuyên */}
      {overallAdvice && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-ink-700 dark:bg-ink-800/50">
          <p className="font-bold text-brand-700 dark:text-brand-300">🧭 Lời khuyên</p>
          <p className="mt-1 text-ink-700 dark:text-ink-200">{overallAdvice}</p>
        </div>
      )}

      <AiAnalyze type="TAROT" result={r} question={q} enabled={ai} price={aiPrice} />
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
