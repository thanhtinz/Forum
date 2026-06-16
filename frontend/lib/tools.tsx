'use client';

import { useState } from 'react';

// ── Helpers UI ──
function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-xs font-medium text-ink-500">{label}</div>{children}</div>;
}
function TextTool({ run, placeholder }: { run: (i: string) => string; placeholder?: string }) {
  const [inp, setInp] = useState('');
  let out = '';
  try { out = run(inp); } catch (e: any) { out = '⚠️ ' + e.message; }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Box label="Đầu vào"><textarea className="input h-48 resize-y font-mono text-sm" value={inp} onChange={(e) => setInp(e.target.value)} placeholder={placeholder} /></Box>
      <Box label="Kết quả"><textarea readOnly className="input h-48 resize-y bg-ink-50 font-mono text-sm dark:bg-ink-900" value={out} /></Box>
    </div>
  );
}

// ── Tools ──
function JsonFormatter() { return <TextTool placeholder='{"a":1}' run={(i) => (i ? JSON.stringify(JSON.parse(i), null, 2) : '')} />; }
function Base64Tool() {
  const [mode, setMode] = useState<'enc' | 'dec'>('enc');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => setMode('enc')} className={mode === 'enc' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Mã hoá</button>
        <button onClick={() => setMode('dec')} className={mode === 'dec' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Giải mã</button>
      </div>
      <TextTool run={(i) => (!i ? '' : mode === 'enc' ? btoa(unescape(encodeURIComponent(i))) : decodeURIComponent(escape(atob(i))))} />
    </div>
  );
}
function UrlEncodeTool() {
  const [mode, setMode] = useState<'enc' | 'dec'>('enc');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => setMode('enc')} className={mode === 'enc' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Encode</button>
        <button onClick={() => setMode('dec')} className={mode === 'dec' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Decode</button>
      </div>
      <TextTool run={(i) => (mode === 'enc' ? encodeURIComponent(i) : decodeURIComponent(i))} />
    </div>
  );
}
function CaseConverter() {
  const [t, setT] = useState('');
  const cases: [string, (s: string) => string][] = [
    ['UPPERCASE', (s) => s.toUpperCase()],
    ['lowercase', (s) => s.toLowerCase()],
    ['camelCase', (s) => s.toLowerCase().replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))],
    ['snake_case', (s) => s.trim().replace(/\s+/g, '_').toLowerCase()],
    ['kebab-case', (s) => s.trim().replace(/\s+/g, '-').toLowerCase()],
    ['Title Case', (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())],
  ];
  return (
    <div className="space-y-3">
      <textarea className="input h-24" value={t} onChange={(e) => setT(e.target.value)} placeholder="Nhập văn bản…" />
      {cases.map(([n, fn]) => (
        <div key={n} className="flex items-center gap-2 text-sm">
          <span className="w-28 text-ink-500">{n}</span>
          <code className="flex-1 break-all rounded bg-ink-50 px-2 py-1 dark:bg-ink-900">{t ? fn(t) : ''}</code>
        </div>
      ))}
    </div>
  );
}
function WordCounter() {
  const [t, setT] = useState('');
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  const lines = t ? t.split(/\n/).length : 0;
  return (
    <div className="space-y-3">
      <textarea className="input h-40" value={t} onChange={(e) => setT(e.target.value)} placeholder="Dán văn bản…" />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Ký tự', t.length], ['Từ', words], ['Dòng', lines]].map(([l, v]) => (
          <div key={l as string} className="card p-3"><div className="text-2xl font-bold">{v as number}</div><div className="text-xs text-ink-500">{l}</div></div>
        ))}
      </div>
    </div>
  );
}
function UuidGenerator() {
  const [list, setList] = useState<string[]>([]);
  const gen = () => setList(Array.from({ length: 5 }, () => crypto.randomUUID()));
  return (
    <div className="space-y-3">
      <button onClick={gen} className="btn-primary">Sinh 5 UUID</button>
      <div className="space-y-1">{list.map((u) => <code key={u} className="block rounded bg-ink-50 px-2 py-1 text-sm dark:bg-ink-900">{u}</code>)}</div>
    </div>
  );
}
function PasswordGenerator() {
  const [len, setLen] = useState(16);
  const [pw, setPw] = useState('');
  const gen = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const arr = crypto.getRandomValues(new Uint32Array(len));
    setPw(Array.from(arr, (n) => chars[n % chars.length]).join(''));
  };
  return (
    <div className="space-y-3">
      <label className="text-sm">Độ dài: {len}<input type="range" min={6} max={48} value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-full" /></label>
      <button onClick={gen} className="btn-primary">Tạo mật khẩu</button>
      {pw && <code className="block break-all rounded bg-ink-50 px-3 py-2 dark:bg-ink-900">{pw}</code>}
    </div>
  );
}
function HashTool() {
  const [inp, setInp] = useState(''); const [out, setOut] = useState('');
  async function hash(algo: string) {
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(inp));
    setOut(`${algo}: ` + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));
  }
  return (
    <div className="space-y-3">
      <textarea className="input h-24" value={inp} onChange={(e) => setInp(e.target.value)} placeholder="Văn bản cần hash…" />
      <div className="flex gap-2">{['SHA-1', 'SHA-256', 'SHA-512'].map((a) => <button key={a} onClick={() => hash(a)} className="btn-outline !py-1 text-xs">{a}</button>)}</div>
      {out && <code className="block break-all rounded bg-ink-50 px-3 py-2 text-sm dark:bg-ink-900">{out}</code>}
    </div>
  );
}
function SlugGenerator() {
  return <TextTool placeholder="Tiêu đề bài viết" run={(i) => i.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')} />;
}
function TimestampConverter() {
  const [t, setT] = useState(String(Math.floor(Date.now() / 1000)));
  const n = Number(t);
  const date = isNaN(n) ? '' : new Date(n > 1e12 ? n : n * 1000).toLocaleString('vi');
  return (
    <div className="space-y-3">
      <input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="Unix timestamp" />
      <div className="card p-3 text-sm">→ {date || 'không hợp lệ'}</div>
      <button onClick={() => setT(String(Math.floor(Date.now() / 1000)))} className="btn-outline text-xs">Hiện tại</button>
    </div>
  );
}
function NumberBaseConverter() {
  const [dec, setDec] = useState('255');
  const n = parseInt(dec, 10);
  return (
    <div className="space-y-2">
      <input className="input" value={dec} onChange={(e) => setDec(e.target.value)} placeholder="Số thập phân" />
      {[['Nhị phân', 2], ['Bát phân', 8], ['Thập lục', 16]].map(([l, b]) => (
        <div key={l as string} className="flex gap-2 text-sm"><span className="w-24 text-ink-500">{l}</span><code className="flex-1 rounded bg-ink-50 px-2 py-1 dark:bg-ink-900">{isNaN(n) ? '—' : n.toString(b as number)}</code></div>
      ))}
    </div>
  );
}
function RandomNumber() {
  const [min, setMin] = useState(1); const [max, setMax] = useState(100); const [r, setR] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input type="number" className="input" value={min} onChange={(e) => setMin(Number(e.target.value))} /><input type="number" className="input" value={max} onChange={(e) => setMax(Number(e.target.value))} /></div>
      <button onClick={() => setR(Math.floor(Math.random() * (max - min + 1)) + min)} className="btn-primary">Random</button>
      {r != null && <div className="text-center text-4xl font-bold text-brand-600">{r}</div>}
    </div>
  );
}
function JwtDecoder() {
  return <TextTool placeholder="eyJ..." run={(i) => {
    if (!i) return '';
    const [h, p] = i.split('.');
    const dec = (s: string) => JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))), null, 2);
    return `HEADER:\n${dec(h)}\n\nPAYLOAD:\n${dec(p)}`;
  }} />;
}
function LoremIpsum() {
  const base = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';
  const [n, setN] = useState(3);
  return (
    <div className="space-y-3">
      <label className="text-sm">Số đoạn: {n}<input type="range" min={1} max={10} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full" /></label>
      <div className="space-y-2">{Array.from({ length: n }, (_, i) => <p key={i} className="text-sm text-ink-600 dark:text-ink-300">{base.repeat(3)}</p>)}</div>
    </div>
  );
}

export const TOOL_REGISTRY: Record<string, () => JSX.Element> = {
  JsonFormatter, JsonValidator: JsonFormatter, Base64Tool, UrlEncodeTool, CaseConverter,
  WordCounter, UuidGenerator, PasswordGenerator, HashTool, SlugGenerator,
  TimestampConverter, NumberBaseConverter, RandomNumber, JwtDecoder, LoremIpsum,
};
