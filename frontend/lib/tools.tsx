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

// ── Formatters bổ sung ──
function indentTags(s: string) {
  const tokens = s.replace(/>\s*</g, '>\n<').split('\n');
  let depth = 0;
  return tokens.map((t) => {
    if (/^<\//.test(t)) depth = Math.max(0, depth - 1);
    const line = '  '.repeat(depth) + t.trim();
    if (/^<[^/!?][^>]*[^/]>$/.test(t) && !/<.*<\//.test(t)) depth++;
    return line;
  }).join('\n');
}
function XmlFormatter() { return <TextTool placeholder="<a><b>1</b></a>" run={(i) => (i ? indentTags(i) : '')} />; }
function HtmlFormatter() { return <TextTool placeholder="<div><p>hi</p></div>" run={(i) => (i ? indentTags(i) : '')} />; }
function SqlFormatter() {
  const kw = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE'];
  return <TextTool placeholder="select * from users where id=1" run={(i) => {
    let s = i;
    for (const k of kw) s = s.replace(new RegExp(`\\b${k}\\b`, 'gi'), '\n' + k);
    return s.replace(/\n+/g, '\n').trim();
  }} />;
}
function CssFormatter() { return <TextTool placeholder="a{color:red}" run={(i) => i.replace(/\s*{\s*/g, ' {\n  ').replace(/;\s*/g, ';\n  ').replace(/\s*}\s*/g, '\n}\n').trim()} />; }
function JsMinifier() { return <TextTool placeholder="// code" run={(i) => i.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()} />; }
function MarkdownPreview() {
  const [t, setT] = useState('# Tiêu đề\n\n**đậm** *nghiêng*\n\n- mục 1\n- mục 2');
  const html = t
    .replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>').replace(/^- (.*)$/gm, '<li>$1</li>').replace(/\n/g, '<br/>');
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Box label="Markdown"><textarea className="input h-48 font-mono text-sm" value={t} onChange={(e) => setT(e.target.value)} /></Box>
      <Box label="Xem trước"><div className="prose prose-sm h-48 overflow-auto rounded-lg border border-ink-200/70 p-3 dark:border-ink-800" dangerouslySetInnerHTML={{ __html: html }} /></Box>
    </div>
  );
}

// ── Validators ──
function verdict(ok: boolean, msg: string) { return <div className={`rounded-lg p-3 text-sm ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>; }
function EmailValidator() {
  const [v, setV] = useState('');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return <div className="space-y-3"><input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="email@example.com" />{v && verdict(ok, ok ? 'Email hợp lệ ✓' : 'Email không hợp lệ ✗')}</div>;
}
function UrlValidator() {
  const [v, setV] = useState('');
  let ok = false; try { new URL(v); ok = true; } catch { /* */ }
  return <div className="space-y-3"><input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="https://..." />{v && verdict(ok, ok ? 'URL hợp lệ ✓' : 'URL không hợp lệ ✗')}</div>;
}
function CreditCardValidator() {
  const [v, setV] = useState('');
  const d = v.replace(/\D/g, '');
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
  const ok = d.length >= 13 && sum % 10 === 0;
  return <div className="space-y-3"><input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="4111 1111 1111 1111" />{d && verdict(ok, ok ? 'Số thẻ hợp lệ (Luhn) ✓' : 'Số thẻ không hợp lệ ✗')}</div>;
}
function CronValidator() {
  const [v, setV] = useState('*/5 * * * *');
  const parts = v.trim().split(/\s+/);
  const ok = parts.length === 5;
  return <div className="space-y-3"><input className="input font-mono" value={v} onChange={(e) => setV(e.target.value)} />{verdict(ok, ok ? `Hợp lệ: ${parts.length} trường (phút giờ ngày tháng thứ)` : 'Cron cần đúng 5 trường')}</div>;
}
function RegexTester() {
  const [pat, setPat] = useState('\\d+'); const [txt, setTxt] = useState('abc 123 def 456');
  let out = '';
  try { const m = txt.match(new RegExp(pat, 'g')); out = m ? m.join(', ') : '(không khớp)'; } catch (e: any) { out = '⚠️ ' + e.message; }
  return (
    <div className="space-y-2">
      <input className="input font-mono" value={pat} onChange={(e) => setPat(e.target.value)} placeholder="Regex" />
      <textarea className="input h-24" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Chuỗi test" />
      <div className="rounded-lg bg-ink-50 p-3 text-sm dark:bg-ink-900">Khớp: {out}</div>
    </div>
  );
}

// ── Encoders ──
function HtmlEntitiesTool() {
  const [mode, setMode] = useState<'enc' | 'dec'>('enc');
  const enc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const dec = (s: string) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[m]!));
  return <div className="space-y-2"><div className="flex gap-2"><button onClick={() => setMode('enc')} className={mode === 'enc' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Encode</button><button onClick={() => setMode('dec')} className={mode === 'dec' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Decode</button></div><TextTool run={(i) => (mode === 'enc' ? enc(i) : dec(i))} /></div>;
}
const MORSE: Record<string, string> = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.' };
function MorseTool() {
  const rev = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
  return <TextTool placeholder="HELLO hoặc .... . .-.. .-.. ---" run={(i) => {
    if (!i) return '';
    if (/^[.\-\s/]+$/.test(i)) return i.trim().split(/\s+/).map((c) => rev[c] || '?').join('');
    return i.toUpperCase().split('').map((c) => (c === ' ' ? '/' : MORSE[c] || '')).join(' ');
  }} />;
}

// ── Generators ──
function QrGenerator() {
  const [t, setT] = useState('https://example.com');
  return (
    <div className="space-y-3">
      <input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="Nội dung/URL" />
      {t && /* eslint-disable-next-line @next/next/no-img-element */ <img alt="QR" className="rounded-lg border border-ink-200/70 dark:border-ink-800" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(t)}`} />}
    </div>
  );
}
function FakeDataGenerator() {
  const names = ['An', 'Bình', 'Cường', 'Dũng', 'Hà', 'Lan', 'Minh', 'Nam', 'Quân', 'Trang'];
  const [rows, setRows] = useState<any[]>([]);
  const gen = () => setRows(Array.from({ length: 5 }, () => { const n = names[Math.floor(Math.random() * names.length)]; const id = Math.floor(Math.random() * 9999); return { name: `Nguyễn ${n}`, email: `${n.toLowerCase()}${id}@mail.com`, phone: '09' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0') }; }));
  return <div className="space-y-3"><button onClick={gen} className="btn-primary">Sinh 5 bản ghi</button>{rows.map((r, i) => <div key={i} className="rounded bg-ink-50 px-3 py-1 text-sm dark:bg-ink-900">{r.name} · {r.email} · {r.phone}</div>)}</div>;
}
function ColorPalette() {
  const [cols, setCols] = useState<string[]>([]);
  const gen = () => setCols(Array.from({ length: 5 }, () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')));
  return <div className="space-y-3"><button onClick={gen} className="btn-primary">Tạo bảng màu</button><div className="flex gap-2">{cols.map((c) => <div key={c} className="flex-1 text-center"><div className="h-16 rounded-lg" style={{ background: c }} /><code className="text-xs">{c}</code></div>)}</div></div>;
}

// ── Converters ──
function JsonCsvConverter() {
  return <TextTool placeholder='[{"a":1,"b":2}]' run={(i) => {
    if (!i) return '';
    const arr = JSON.parse(i); if (!Array.isArray(arr) || !arr.length) return '';
    const keys = Object.keys(arr[0]);
    return [keys.join(','), ...arr.map((o: any) => keys.map((k) => JSON.stringify(o[k] ?? '')).join(','))].join('\n');
  }} />;
}
function JsonYamlConverter() {
  const toYaml = (o: any, ind = 0): string => {
    const pad = '  '.repeat(ind);
    if (Array.isArray(o)) return o.map((v) => `${pad}- ${typeof v === 'object' ? '\n' + toYaml(v, ind + 1) : v}`).join('\n');
    if (o && typeof o === 'object') return Object.entries(o).map(([k, v]) => typeof v === 'object' && v ? `${pad}${k}:\n${toYaml(v, ind + 1)}` : `${pad}${k}: ${v}`).join('\n');
    return `${pad}${o}`;
  };
  return <TextTool placeholder='{"a":1,"b":[1,2]}' run={(i) => (i ? toYaml(JSON.parse(i)) : '')} />;
}
function ColorConverter() {
  const [hex, setHex] = useState('#7c3aed');
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const rgb = m ? [0, 2, 4].map((p) => parseInt(m[1].slice(p, p + 2), 16)) : null;
  return <div className="space-y-3"><div className="flex gap-2"><input className="input" value={hex} onChange={(e) => setHex(e.target.value)} /><input type="color" value={m ? '#' + m[1] : '#000000'} onChange={(e) => setHex(e.target.value)} className="h-9 w-12" /></div>{rgb && <div className="card p-3 text-sm">rgb({rgb.join(', ')}) · <span className="inline-block h-4 w-4 rounded align-middle" style={{ background: hex }} /></div>}</div>;
}
function UnitConverter() {
  const [v, setV] = useState(1);
  const items: [string, number][] = [['mét', 1], ['cm', 100], ['mm', 1000], ['inch', 39.37], ['feet', 3.281], ['km', 0.001]];
  return <div className="space-y-2"><input type="number" className="input" value={v} onChange={(e) => setV(Number(e.target.value))} /><div className="text-xs text-ink-500">Quy đổi từ mét:</div>{items.map(([n, f]) => <div key={n} className="flex gap-2 text-sm"><span className="w-16 text-ink-500">{n}</span><code>{(v * f).toLocaleString()}</code></div>)}</div>;
}
function ImageBase64() {
  const [out, setOut] = useState('');
  return <div className="space-y-3"><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setOut(String(r.result)); r.readAsDataURL(f); }} />{out && <textarea readOnly className="input h-40 font-mono text-xs" value={out} />}</div>;
}

// ── Calculators ──
function Calc({ fields, compute }: { fields: [string, string][]; compute: (v: Record<string, number>) => string }) {
  const [v, setV] = useState<Record<string, number>>({});
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">{fields.map(([k, l]) => <label key={k} className="text-sm">{l}<input type="number" className="input mt-1" onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} /></label>)}</div>
      <div className="card p-3 text-center text-lg font-bold text-brand-600">{compute(v)}</div>
    </div>
  );
}
function PercentageCalc() { return <Calc fields={[['a', 'Giá trị'], ['p', 'Phần trăm %']]} compute={(v) => v.a && v.p ? `${v.a} × ${v.p}% = ${(v.a * v.p / 100).toLocaleString()}` : '—'} />; }
function BmiCalc() { return <Calc fields={[['w', 'Cân nặng (kg)'], ['h', 'Chiều cao (cm)']]} compute={(v) => { if (!v.w || !v.h) return '—'; const b = v.w / ((v.h / 100) ** 2); return `BMI = ${b.toFixed(1)} (${b < 18.5 ? 'gầy' : b < 25 ? 'bình thường' : b < 30 ? 'thừa cân' : 'béo phì'})`; }} />; }
function LoanCalc() { return <Calc fields={[['p', 'Số tiền vay'], ['r', 'Lãi %/năm'], ['n', 'Số tháng']]} compute={(v) => { if (!v.p || !v.n) return '—'; const r = (v.r / 100) / 12; const m = r ? v.p * r / (1 - Math.pow(1 + r, -v.n)) : v.p / v.n; return `Trả/tháng ≈ ${Math.round(m).toLocaleString()}`; }} />; }
function TipCalc() { return <Calc fields={[['b', 'Hóa đơn'], ['p', 'Tip %'], ['n', 'Số người']]} compute={(v) => { if (!v.b) return '—'; const total = v.b * (1 + (v.p || 0) / 100); return `Tổng ${Math.round(total).toLocaleString()} · mỗi người ${Math.round(total / (v.n || 1)).toLocaleString()}`; }} />; }
function AgeCalc() {
  const [d, setD] = useState('');
  let txt = '—';
  if (d) { const diff = Date.now() - new Date(d).getTime(); const y = diff / (365.25 * 864e5); txt = `${Math.floor(y)} tuổi (${Math.floor(diff / 864e5)} ngày)`; }
  return <div className="space-y-3"><input type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} /><div className="card p-3 text-center font-bold text-brand-600">{txt}</div></div>;
}
function DateDiff() {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const txt = a && b ? `${Math.abs(Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5))} ngày` : '—';
  return <div className="space-y-3"><div className="flex gap-2"><input type="date" className="input" value={a} onChange={(e) => setA(e.target.value)} /><input type="date" className="input" value={b} onChange={(e) => setB(e.target.value)} /></div><div className="card p-3 text-center font-bold text-brand-600">{txt}</div></div>;
}
function ScientificCalc() {
  const [expr, setExpr] = useState('2*(3+4)');
  let res = '';
  try { if (/^[-+*/().\d\s,a-zMathsqrtpilogexsincoab]*$/.test(expr)) { res = String(Function('Math', `"use strict";return (${expr})`)(Math)); } else res = '⚠️ ký tự không hợp lệ'; } catch { res = '⚠️ lỗi'; }
  return <div className="space-y-3"><input className="input font-mono" value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="VD: Math.sqrt(16)+2*3" /><div className="card p-3 text-center text-xl font-bold text-brand-600">{res}</div></div>;
}

export const TOOL_REGISTRY: Record<string, () => JSX.Element> = {
  JsonFormatter, JsonValidator: JsonFormatter, Base64Tool, UrlEncodeTool, CaseConverter,
  WordCounter, UuidGenerator, PasswordGenerator, HashTool, SlugGenerator,
  TimestampConverter, NumberBaseConverter, RandomNumber, JwtDecoder, LoremIpsum,
  XmlFormatter, HtmlFormatter, SqlFormatter, CssFormatter, JsMinifier, MarkdownPreview,
  EmailValidator, UrlValidator, CreditCardValidator, CronValidator, RegexTester,
  HtmlEntitiesTool, MorseTool, QrGenerator, FakeDataGenerator, ColorPalette,
  JsonCsvConverter, JsonYamlConverter, ColorConverter, UnitConverter, ImageBase64,
  PercentageCalc, BmiCalc, LoanCalc, TipCalc, AgeCalc, DateDiff, ScientificCalc,
};
