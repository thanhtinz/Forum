'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Moon, Coins, Star, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'tarot' | 'zodiac';

export default function FortunePage() {
  const [tab, setTab] = useState<Tab>('tarot');

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles /> Tarot & Cung Hoàng Đạo</h1>
        <p className="text-white/85">Bốc bài Tarot theo chủ đề · Tử vi 12 cung hoàng đạo</p>
      </header>

      <div className="flex gap-2">
        {([['tarot', 'Tarot', Moon], ['zodiac', 'Cung hoàng đạo', Star]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'tarot' && <Tarot />}
      {tab === 'zodiac' && <Zodiac />}
    </div>
  );
}

// ───────────────────────── TAROT ─────────────────────────

type Topic = { id: string; title: string; desc: string; n: number; img: number };
const TAROT_CATS: { key: string; label: string; topics: Topic[] }[] = [
  { key: 'overview', label: 'Tổng quan', topics: [
    { id: 'today', title: 'Tổng quan hôm nay', desc: 'Xem năng lượng tổng quan trong ngày của bạn', n: 3, img: 17 },
    { id: 'yesno', title: 'CÓ hay KHÔNG', desc: 'Giải đáp vấn đề băn khoăn của bạn', n: 1, img: 13 },
    { id: 'week', title: 'Tổng quan tuần này', desc: 'Xem năng lượng tổng quan trong tuần này của bạn', n: 5, img: 10 },
  ] },
  { key: 'love', label: 'Tình cảm', topics: [
    { id: 'cur', title: 'Người yêu hiện tại', desc: 'Xem về người yêu hiện tại của bạn', n: 3, img: 17 },
    { id: 'future', title: 'Người yêu tương lai', desc: 'Xem về người yêu tương lai của bạn', n: 3, img: 14 },
    { id: 'ex', title: 'Người yêu cũ', desc: 'Trải bài về người yêu cũ của bạn', n: 3, img: 13 },
    { id: 'crush', title: 'Người bạn thích', desc: 'Trải bài về người bạn thích (crush)', n: 3, img: 11 },
    { id: 'situationship', title: 'Mối quan hệ mập mờ', desc: 'Trải bài về mối quan hệ mập mờ của bạn', n: 3, img: 10 },
    { id: 'ldr', title: 'Yêu xa', desc: 'Trải bài về tình yêu xa', n: 3, img: 17 },
    { id: 'nocontact', title: 'Ngừng liên lạc', desc: 'Trải bài về Ngừng liên lạc', n: 3, img: 10 },
    { id: 'marriage', title: 'Hôn nhân gia đình', desc: 'Trải bài về Hôn nhân gia đình', n: 5, img: 14 },
    { id: 'friends', title: 'Bạn bè, đồng nghiệp,...', desc: 'Trải bài về Bạn bè, đồng nghiệp,...', n: 3, img: 14 },
  ] },
  { key: 'work', label: 'Công việc', topics: [
    { id: 'career', title: 'Công việc', desc: 'Trải bài về công việc', n: 3, img: 17 },
    { id: 'money', title: 'Tài chính', desc: 'Trải bài về tài chính', n: 3, img: 14 },
    { id: 'self', title: 'Định hướng bản thân', desc: 'Trải bài về Định hướng bản thân', n: 5, img: 13 },
  ] },
  { key: 'study', label: 'Học tập', topics: [
    { id: 'study', title: 'Học tập', desc: 'Trải bài về học tập', n: 3, img: 17 },
    { id: 'exam', title: 'Thi cử', desc: 'Trải bài về thi cử', n: 3, img: 14 },
  ] },
];

const SPREAD_POS: Record<number, string[]> = {
  1: ['Thông điệp'],
  3: ['Quá khứ', 'Hiện tại', 'Tương lai'],
  5: ['Bản thân', 'Hoàn cảnh', 'Thử thách', 'Lời khuyên', 'Kết quả'],
};
const posList = (n: number) => SPREAD_POS[n] || Array.from({ length: n }, (_, i) => `Lá ${i + 1}`);

const TIPS = [
  { title: 'Hít thở sâu', body: 'Trước mỗi trải bài, hãy hít một hơi thật sâu. Cố gắng thư giãn và tập trung vào câu hỏi của bạn. Hãy để những luồng suy nghĩ xung quanh đến và đi một lúc mà không cần phải bận tâm.' },
  { title: 'Tập trung ý định', body: 'Giữ trong tâm trí điều bạn thật sự muốn biết. Một câu hỏi rõ ràng sẽ cho một thông điệp rõ ràng. Tránh hỏi quá nhiều việc trong cùng một lần trải bài.' },
  { title: 'Giữ tâm thế cởi mở', body: 'Đón nhận thông điệp của lá bài một cách trung thực, kể cả khi nó khác với mong đợi. Tarot gợi mở góc nhìn để bạn tự quyết định, không phán xét đúng sai.' },
];

const tarotImg = (num: number) => `/game-assets/tarot/${num}.jpg`;

// Mặt sau lá bài (ảnh thật của bộ bài)
function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-violet-300/30 shadow-md ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/game-assets/tarot/card-back.png" alt="" draggable={false} className="h-full w-full select-none object-cover" />
    </div>
  );
}

// Mặt trước lá bài (ảnh thật, lật ngược nếu lá ngược)
function CardFace({ card, className = '' }: { card: any; className?: string }) {
  return (
    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-ink-200/70 shadow-sm dark:border-ink-800 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.image} alt={card.nameVi} draggable={false}
        className={`h-full w-full select-none object-cover ${card.reversedOrientation ? 'rotate-180' : ''}`} />
    </div>
  );
}

type Step = 'topics' | 'intro' | 'pick' | 'result';
const FAN = 30;            // số lá úp xếp trên vòng cung
const WHEEL_R = 520;       // bán kính vòng cung (px)
const WHEEL_CY = WHEEL_R + 72; // tâm vòng nằm dưới khung
const WHEEL_STEP = 8;      // góc giữa 2 lá (độ)
const WHEEL_LIMIT = ((FAN - 1) / 2) * WHEEL_STEP; // giới hạn xoay để mọi lá tới được đỉnh

function Tarot() {
  const [step, setStep] = useState<Step>('topics');
  const [cat, setCat] = useState(0);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [tipIdx, setTipIdx] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [q, setQ] = useState('');
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [rot, setRot] = useState(0);     // góc xoay vòng cung (độ)
  const [fanW, setFanW] = useState(360);
  const slotRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const dragSt = useRef({ down: false, startX: 0, startRot: 0, moved: false });

  // Đo bề ngang khung vòng cung để đặt tâm
  useEffect(() => {
    if (step !== 'pick' || flipped) return;
    const measure = () => { if (fanRef.current) setFanW(fanRef.current.clientWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step, flipped]);

  // Kéo để xoay vòng cung (cả chuột lẫn cảm ứng)
  function fanDown(e: React.PointerEvent) {
    try { fanRef.current?.setPointerCapture(e.pointerId); } catch { /* noop */ }
    dragSt.current = { down: true, startX: e.clientX, startRot: rot, moved: false };
  }
  function fanMove(e: React.PointerEvent) {
    if (!dragSt.current.down) return;
    const dx = e.clientX - dragSt.current.startX;
    if (Math.abs(dx) > 4) dragSt.current.moved = true;
    const next = Math.max(-WHEEL_LIMIT, Math.min(WHEEL_LIMIT, dragSt.current.startRot + dx * 0.18));
    setRot(next);
  }
  function fanUp() { dragSt.current.down = false; }

  function reset() {
    setStep('topics'); setTopic(null); setTipIdx(0); setPicked([]);
    setFlipped(false); setQ(''); setR(null); setErr(''); setLoading(false); setRot(0);
  }

  function chooseTopic(t: Topic) {
    setTopic(t); setTipIdx(0); setPicked([]); setFlipped(false); setR(null); setErr(''); setQ('');
    setStep('intro');
  }

  // Bắt đầu: vào bước rút bài + gọi API bốc bài (ẩn cho tới khi lật)
  async function begin() {
    if (!topic) return;
    setPicked([]); setFlipped(false); setR(null); setErr(''); setRot(0); setStep('pick');
    setLoading(true);
    try {
      const res = await api.post('/fortune/tarot', { n: topic.n, question: topic.title, topic: TAROT_CATS[cat].key });
      setR(res);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function pickFan(i: number) {
    if (dragSt.current.moved) return; // vừa kéo thì không tính là chọn
    if (!topic || flipped) return;
    if (picked.includes(i)) return;
    if (picked.length >= topic.n) return;
    setPicked((p) => [...p, i]);
  }

  function flip() {
    if (!topic || picked.length !== topic.n || !r) return;
    setFlipped(true);
    setTimeout(() => slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  }

  const cats = TAROT_CATS;

  return (
    <div className="space-y-4">
      {step !== 'topics' && (
        <button onClick={() => (step === 'intro' ? setStep('topics') : reset())}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ChevronLeft size={16} /> {step === 'intro' ? 'Chọn trải bài khác' : 'Trải bài lại từ đầu'}
        </button>
      )}

      {/* ───── BƯỚC 1: chọn trải bài theo tab chủ đề ───── */}
      {step === 'topics' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Trải bài</h2>
            <p className="text-sm text-ink-500">Hôm nay bạn muốn xem trải bài gì?</p>
          </div>
          {/* Tabs chủ đề */}
          <div className="flex gap-5 overflow-x-auto border-b border-ink-200/70 text-sm dark:border-ink-800">
            {cats.map((c, i) => (
              <button key={c.key} onClick={() => setCat(i)}
                className={`-mb-px shrink-0 border-b-2 pb-2 font-semibold transition ${cat === i ? 'border-brand-600 text-ink-900 dark:text-white' : 'border-transparent text-ink-400 hover:text-ink-600'}`}>
                {c.label}
              </button>
            ))}
          </div>
          {/* Danh sách trải bài */}
          <div className="space-y-3">
            {cats[cat].topics.map((t) => (
              <div key={t.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">{t.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">{t.desc}</p>
                  <button onClick={() => chooseTopic(t)}
                    className="mt-3 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-ink-700 dark:hover:bg-ink-600">
                    Trải bài ngay
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tarotImg(t.img)} alt="" className="h-24 w-16 shrink-0 rounded-md object-cover shadow-sm sm:h-28 sm:w-[74px]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── BƯỚC 2: lưu ý + bắt đầu ───── */}
      {step === 'intro' && topic && (
        <div className="space-y-4">
          <div className="card flex items-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tarotImg(topic.img)} alt="" className="h-20 w-[54px] shrink-0 rounded-md object-cover shadow-sm" />
            <div>
              <h2 className="text-lg font-bold">{topic.title}</h2>
              <p className="text-sm text-ink-500">{topic.desc} · trải {topic.n} lá</p>
            </div>
          </div>

          <p className="font-bold">Một số lưu ý nhỏ</p>
          <div className="card min-h-[160px] p-5">
            <p className="font-semibold">{TIPS[tipIdx].title}</p>
            <p className="mt-2 text-ink-600 dark:text-ink-300">{TIPS[tipIdx].body}</p>
          </div>
          <div className="flex justify-center gap-2">
            {TIPS.map((_, i) => (
              <button key={i} onClick={() => setTipIdx(i)} aria-label={`Lưu ý ${i + 1}`}
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${tipIdx === i ? 'bg-ink-900 text-white dark:bg-ink-600' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={begin} className="w-full rounded-xl bg-ink-900 py-3 font-semibold text-white hover:bg-ink-800 dark:bg-ink-700 dark:hover:bg-ink-600">
            Bắt đầu
          </button>
        </div>
      )}

      {/* ───── BƯỚC 3: rút bài từ bộ bài xòe ───── */}
      {step === 'pick' && topic && (
        <div className="space-y-5">
          {/* Hàng ô bài đã chọn */}
          <div ref={slotRef} className="flex justify-center gap-2">
            {Array.from({ length: topic.n }).map((_, idx) => {
              const filled = idx < picked.length;
              const card = flipped && r ? r.cards[idx] : null;
              return (
                <div key={idx} className="w-[19%] max-w-[84px]">
                  {card
                    ? <CardFace card={card} className="animate-[flip-in_.5s_ease]" />
                    : filled
                      ? <CardBack />
                      : <div className="aspect-[2/3] w-full rounded-lg border-2 border-dashed border-ink-300 dark:border-ink-700" />}
                </div>
              );
            })}
          </div>

          {!flipped ? (
            <>
              <p className="text-center text-sm text-ink-500">
                {loading ? 'Đang chuẩn bị bộ bài…' : `Tập trung vào câu hỏi rồi chọn ${topic.n} lá (${picked.length}/${topic.n})`}
              </p>
              <button onClick={flip} disabled={picked.length !== topic.n || loading || !r}
                className="mx-auto block rounded-xl bg-ink-900 px-10 py-3 font-semibold text-white enabled:hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400 dark:bg-ink-700 dark:disabled:bg-ink-800">
                Lật bài
              </button>

              {/* Bộ bài úp xếp trên vòng cung — kéo để xoay, chạm để chọn */}
              <p className="text-center text-xs text-ink-400">Kéo để xoay vòng bài · chạm để chọn</p>
              <div ref={fanRef} onPointerDown={fanDown} onPointerMove={fanMove} onPointerUp={fanUp} onPointerLeave={fanUp} onPointerCancel={fanUp}
                className="relative mx-auto h-60 w-full max-w-lg cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing">
                {Array.from({ length: FAN }).map((_, i) => {
                  const mid = (FAN - 1) / 2;
                  const angle = (i - mid) * WHEEL_STEP + rot;
                  const rad = (angle * Math.PI) / 180;
                  const x = fanW / 2 + WHEEL_R * Math.sin(rad);
                  const y = WHEEL_CY - WHEEL_R * Math.cos(rad);
                  const isPicked = picked.includes(i);
                  const hidden = Math.abs(angle) > 78;
                  return (
                    <button key={i} onClick={() => pickFan(i)} disabled={isPicked || picked.length >= topic.n || hidden}
                      aria-label={`Lá ${i + 1}`}
                      className="absolute w-14 sm:w-[68px]"
                      style={{
                        left: x, top: y,
                        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                        zIndex: Math.round(100 - Math.abs(angle)),
                        opacity: isPicked || hidden ? 0 : 1,
                        pointerEvents: isPicked || hidden ? 'none' : 'auto',
                        transition: dragSt.current.down ? 'none' : 'opacity .2s ease',
                      }}>
                      <CardBack />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="card space-y-3 p-4">
              <p className="text-center font-semibold">Bạn có câu hỏi cụ thể nào không?</p>
              <p className="text-center text-xs text-ink-500">Kết quả trải bài sẽ chính xác hơn nếu bạn có một câu hỏi rõ ràng.</p>
              <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập câu hỏi của bạn…"
                className="input min-h-[64px]" />
              <button onClick={() => setStep('result')}
                className="w-full rounded-xl bg-ink-900 py-3 font-semibold text-white hover:bg-ink-800 dark:bg-ink-700 dark:hover:bg-ink-600">
                Xem kết quả
              </button>
            </div>
          )}

          {err && <p className="text-center text-sm text-red-500">{err}</p>}
        </div>
      )}

      {/* ───── BƯỚC 4: chi tiết trải bài ───── */}
      {step === 'result' && r && topic && (
        <TarotResult r={r} topic={topic} question={q.trim() || topic.title} onAgain={reset} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-semibold">{label}: </span>
      <span className="text-ink-600 dark:text-ink-300">{value}</span>
    </p>
  );
}

function TarotResult({ r, topic, question, onAgain }: { r: any; topic: Topic; question: string; onAgain: () => void }) {
  const cards: any[] = r.cards;
  const positions = posList(cards.length);
  const reversedCount = cards.filter((c) => c.reversedOrientation).length;
  const overview =
    `Trải bài ${topic.title} (${cards.length} lá): `
    + cards.map((c, i) => `${positions[i]} là ${c.nameVi} (${c.reversedOrientation ? 'ngược' : 'xuôi'})`).join(', ') + '. '
    + (reversedCount === 0 ? 'Năng lượng tổng thể thuận lợi, bạn đang đi đúng hướng.'
      : reversedCount === cards.length ? 'Nhiều lá ngược — hãy chậm lại, nhìn vào nội tâm trước khi hành động.'
      : 'Năng lượng pha trộn giữa thuận và nghịch — cần cân nhắc kỹ trước mỗi quyết định.');
  const advice = cards.map((c) => c.advice).filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Chi tiết trải bài</h2>
        <p className="text-sm text-ink-500">“{question}”</p>
      </div>

      {/* Từng lá bài */}
      {cards.map((c, i) => {
        const rev = c.reversedOrientation;
        return (
          <div key={i} className="card space-y-3 p-4">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.nameVi} className={`h-40 w-[107px] shrink-0 rounded-lg border border-ink-200/70 object-cover shadow-sm dark:border-ink-800 ${rev ? 'rotate-180' : ''}`} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{positions[i]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${rev ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>{rev ? '⟳ Ngược' : '↑ Xuôi'}</span>
                </div>
                <h3 className="text-lg font-bold leading-tight">{c.nameVi}</h3>
                <p className="-mt-1 text-xs text-ink-400">{c.name}</p>
                <Row label="Nguyên tố" value={c.element} />
                <Row label="Cung hoàng đạo" value={c.zodiac} />
                <Row label="Chiêm tinh" value={c.astro} />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {c.meaning?.map((m: string, k: number) => (
                    <span key={k} className="rounded-md border border-ink-200 px-2 py-0.5 text-[11px] text-ink-600 dark:border-ink-700 dark:text-ink-300">{m}</span>
                  ))}
                </div>
              </div>
            </div>
            {c.desc && <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200"><b>{c.nameVi}:</b> {c.desc}</p>}
            {c.advice && <p className="rounded-lg bg-brand-50 p-2.5 text-sm text-brand-700 dark:bg-ink-800/60 dark:text-brand-300">💡 {c.advice}</p>}
          </div>
        );
      })}

      {/* Tổng quan chung */}
      <div className="card space-y-3 p-4">
        <div>
          <p className="font-bold">🌌 Tổng quan chung</p>
          <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{overview}</p>
        </div>
        {advice && (
          <div>
            <p className="font-bold">🧭 Lời khuyên</p>
            <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{advice}</p>
          </div>
        )}
      </div>

      <button onClick={onAgain} className="w-full rounded-xl bg-ink-900 py-3 font-semibold text-white hover:bg-ink-800 dark:bg-ink-700 dark:hover:bg-ink-600">
        Trải bài khác
      </button>
    </div>
  );
}

// ───────────────────────── ZODIAC ─────────────────────────

function Stars({ n }: { n: number }) {
  return <span className="text-amber-400">{'★'.repeat(n)}<span className="text-ink-300 dark:text-ink-600">{'★'.repeat(5 - n)}</span></span>;
}

function Zodiac() {
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
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-ink-50 px-3 py-1.5 text-sm dark:bg-ink-800/50"><span className="text-ink-500">{label}: </span><span className="font-medium">{value}</span></div>;
}
