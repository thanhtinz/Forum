'use client';

import { useState } from 'react';
import { Sparkles, Moon, Hash } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'bazi' | 'tarot' | 'meihua';

export default function FortunePage() {
  const [tab, setTab] = useState<Tab>('bazi');

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles /> Bói toán & Tử vi</h1>
        <p className="text-white/85">Bát Tự (Tứ Trụ) · Tarot · Mai Hoa Dịch Số — engine chuẩn, miễn phí.</p>
      </header>

      <div className="flex gap-2">
        {([['bazi', 'Bát Tự', Hash], ['tarot', 'Tarot', Moon], ['meihua', 'Mai Hoa', Sparkles]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'bazi' && <Bazi />}
      {tab === 'tarot' && <Tarot />}
      {tab === 'meihua' && <Meihua />}
    </div>
  );
}

function Bazi() {
  const [f, setF] = useState({ year: 1995, month: 8, day: 15, hour: 10, minute: 0 });
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const num = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: Number(e.target.value) });

  async function go() { setBusy(true); try { setR(await api.post('/fortune/bazi', f)); } catch {} setBusy(false); }

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
        </div>
      )}
    </div>
  );
}

function Tarot() {
  const [n, setN] = useState(3);
  const [q, setQ] = useState('');
  const [r, setR] = useState<any>(null);
  async function go() { try { setR(await api.post('/fortune/tarot', { n, question: q })); } catch {} }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs">Số lá<select className="input mt-1 w-24" value={n} onChange={(e) => setN(Number(e.target.value))}>
          {[1, 3, 5].map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label className="flex-1 text-xs">Câu hỏi (tuỳ chọn)<input className="input mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: Tình duyên sắp tới?" /></label>
        <button onClick={go} className="btn-primary">Bốc bài</button>
      </div>
      {r && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {r.cards.map((c: any, i: number) => (
            <div key={i} className="card p-4 text-center">
              <div className={`mx-auto grid h-28 w-20 place-items-center rounded-lg bg-gradient-to-b from-violet-600 to-purple-800 text-3xl text-white ${c.reversedOrientation ? 'rotate-180' : ''}`}>✦</div>
              <div className="mt-2 font-semibold">{c.nameVi}</div>
              <div className="text-xs text-ink-500">{c.name} · {c.reversedOrientation ? 'Ngược' : 'Xuôi'}</div>
              <div className="mt-1 text-sm text-brand-600">{c.meaning.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Meihua() {
  const [f, setF] = useState({ num1: '', num2: '', question: '' });
  const [r, setR] = useState<any>(null);
  async function go() {
    try { setR(await api.post('/fortune/meihua', { num1: f.num1 ? Number(f.num1) : undefined, num2: f.num2 ? Number(f.num2) : undefined, question: f.question })); } catch {}
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
      </div>
      {r && (
        <div className="card p-5 text-center">
          <div className="whitespace-pre text-4xl leading-tight">{r.hexagram.symbol}</div>
          <div className="mt-2 text-lg font-bold">{r.hexagram.name}</div>
          <div className="text-sm text-ink-500">Hào động: {r.movingLine}</div>
          <div className="mt-3 inline-block rounded-full bg-brand-100 px-4 py-1 font-semibold text-brand-700">{r.verdict}</div>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{r.analysis}</p>
        </div>
      )}
    </div>
  );
}
