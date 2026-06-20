'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Ruler, ArrowRightLeft, Copy, Star, Search, Share2, History as HistoryIcon, Trash2, Check,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// ĐỊNH NGHĨA ĐƠN VỊ
// Mỗi đơn vị: hệ số `f` quy về đơn vị gốc (tuyến tính); riêng nhiệt độ dùng toBase/fromBase.
// ─────────────────────────────────────────────────────────────
interface Unit { id: string; name: string; sym: string; f?: number; toBase?: (v: number) => number; fromBase?: (v: number) => number }
interface Category { key: string; name: string; units: Unit[] }

const CATEGORIES: Category[] = [
  { key: 'length', name: 'Chiều dài', units: [
    { id: 'mm', name: 'Milimet', sym: 'mm', f: 0.001 },
    { id: 'cm', name: 'Centimet', sym: 'cm', f: 0.01 },
    { id: 'm', name: 'Mét', sym: 'm', f: 1 },
    { id: 'km', name: 'Kilomet', sym: 'km', f: 1000 },
    { id: 'in', name: 'Inch', sym: 'in', f: 0.0254 },
    { id: 'ft', name: 'Feet', sym: 'ft', f: 0.3048 },
    { id: 'yd', name: 'Yard', sym: 'yd', f: 0.9144 },
    { id: 'mi', name: 'Mile', sym: 'mi', f: 1609.344 },
    { id: 'nmi', name: 'Hải lý', sym: 'nmi', f: 1852 },
  ] },
  { key: 'mass', name: 'Khối lượng', units: [
    { id: 'mg', name: 'Miligam', sym: 'mg', f: 0.001 },
    { id: 'g', name: 'Gam', sym: 'g', f: 1 },
    { id: 'kg', name: 'Kilogam', sym: 'kg', f: 1000 },
    { id: 't', name: 'Tấn', sym: 't', f: 1_000_000 },
    { id: 'oz', name: 'Ounce', sym: 'oz', f: 28.349523125 },
    { id: 'lb', name: 'Pound', sym: 'lb', f: 453.59237 },
    { id: 'st', name: 'Stone', sym: 'st', f: 6350.29318 },
  ] },
  { key: 'area', name: 'Diện tích', units: [
    { id: 'mm2', name: 'Milimet vuông', sym: 'mm²', f: 1e-6 },
    { id: 'cm2', name: 'Centimet vuông', sym: 'cm²', f: 1e-4 },
    { id: 'm2', name: 'Mét vuông', sym: 'm²', f: 1 },
    { id: 'km2', name: 'Kilomet vuông', sym: 'km²', f: 1e6 },
    { id: 'ft2', name: 'Feet vuông', sym: 'ft²', f: 0.09290304 },
    { id: 'yd2', name: 'Yard vuông', sym: 'yd²', f: 0.83612736 },
    { id: 'acre', name: 'Acre', sym: 'acre', f: 4046.8564224 },
    { id: 'ha', name: 'Hectare', sym: 'ha', f: 10000 },
  ] },
  { key: 'volume', name: 'Thể tích', units: [
    { id: 'ml', name: 'Mililit', sym: 'ml', f: 0.001 },
    { id: 'l', name: 'Lít', sym: 'L', f: 1 },
    { id: 'm3', name: 'Mét khối', sym: 'm³', f: 1000 },
    { id: 'tsp', name: 'Teaspoon', sym: 'tsp', f: 0.00492892159375 },
    { id: 'tbsp', name: 'Tablespoon', sym: 'tbsp', f: 0.01478676478125 },
    { id: 'cup', name: 'Cup', sym: 'cup', f: 0.2365882365 },
    { id: 'pint', name: 'Pint', sym: 'pt', f: 0.473176473 },
    { id: 'quart', name: 'Quart', sym: 'qt', f: 0.946352946 },
    { id: 'gal', name: 'Gallon', sym: 'gal', f: 3.785411784 },
  ] },
  { key: 'temp', name: 'Nhiệt độ', units: [
    { id: 'c', name: 'Celsius', sym: '°C', toBase: (v) => v, fromBase: (v) => v },
    { id: 'f', name: 'Fahrenheit', sym: '°F', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
    { id: 'k', name: 'Kelvin', sym: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  ] },
  { key: 'speed', name: 'Tốc độ', units: [
    { id: 'ms', name: 'Mét/giây', sym: 'm/s', f: 1 },
    { id: 'kmh', name: 'Kilomet/giờ', sym: 'km/h', f: 1 / 3.6 },
    { id: 'mph', name: 'Dặm/giờ', sym: 'mph', f: 0.44704 },
    { id: 'knot', name: 'Knot', sym: 'kn', f: 1852 / 3600 },
  ] },
  { key: 'time', name: 'Thời gian', units: [
    { id: 'ms', name: 'Mili giây', sym: 'ms', f: 0.001 },
    { id: 's', name: 'Giây', sym: 's', f: 1 },
    { id: 'min', name: 'Phút', sym: 'min', f: 60 },
    { id: 'h', name: 'Giờ', sym: 'h', f: 3600 },
    { id: 'day', name: 'Ngày', sym: 'ngày', f: 86400 },
    { id: 'week', name: 'Tuần', sym: 'tuần', f: 604800 },
    { id: 'month', name: 'Tháng (TB)', sym: 'tháng', f: 2629800 },
    { id: 'year', name: 'Năm (365.25)', sym: 'năm', f: 31557600 },
  ] },
  { key: 'data', name: 'Dung lượng', units: [
    { id: 'bit', name: 'Bit', sym: 'bit', f: 0.125 },
    { id: 'byte', name: 'Byte', sym: 'B', f: 1 },
    { id: 'kb', name: 'Kilobyte', sym: 'KB', f: 1e3 },
    { id: 'mb', name: 'Megabyte', sym: 'MB', f: 1e6 },
    { id: 'gb', name: 'Gigabyte', sym: 'GB', f: 1e9 },
    { id: 'tb', name: 'Terabyte', sym: 'TB', f: 1e12 },
    { id: 'pb', name: 'Petabyte', sym: 'PB', f: 1e15 },
    { id: 'kib', name: 'Kibibyte', sym: 'KiB', f: 1024 },
    { id: 'mib', name: 'Mebibyte', sym: 'MiB', f: 1048576 },
    { id: 'gib', name: 'Gibibyte', sym: 'GiB', f: 1073741824 },
    { id: 'tib', name: 'Tebibyte', sym: 'TiB', f: 1099511627776 },
  ] },
  { key: 'pressure', name: 'Áp suất', units: [
    { id: 'pa', name: 'Pascal', sym: 'Pa', f: 1 },
    { id: 'kpa', name: 'Kilopascal', sym: 'kPa', f: 1000 },
    { id: 'mpa', name: 'Megapascal', sym: 'MPa', f: 1e6 },
    { id: 'bar', name: 'Bar', sym: 'bar', f: 1e5 },
    { id: 'psi', name: 'Psi', sym: 'psi', f: 6894.757293168 },
    { id: 'atm', name: 'Atmosphere', sym: 'atm', f: 101325 },
  ] },
  { key: 'energy', name: 'Năng lượng', units: [
    { id: 'j', name: 'Joule', sym: 'J', f: 1 },
    { id: 'kj', name: 'Kilojoule', sym: 'kJ', f: 1000 },
    { id: 'cal', name: 'Calorie', sym: 'cal', f: 4.184 },
    { id: 'kcal', name: 'Kilocalorie', sym: 'kcal', f: 4184 },
    { id: 'wh', name: 'Watt-hour', sym: 'Wh', f: 3600 },
    { id: 'kwh', name: 'Kilowatt-hour', sym: 'kWh', f: 3.6e6 },
  ] },
  { key: 'power', name: 'Công suất', units: [
    { id: 'w', name: 'Watt', sym: 'W', f: 1 },
    { id: 'kw', name: 'Kilowatt', sym: 'kW', f: 1000 },
    { id: 'mw', name: 'Megawatt', sym: 'MW', f: 1e6 },
    { id: 'hp', name: 'Horsepower', sym: 'HP', f: 745.6998715822702 },
  ] },
  { key: 'angle', name: 'Góc', units: [
    { id: 'deg', name: 'Độ', sym: '°', f: Math.PI / 180 },
    { id: 'rad', name: 'Radian', sym: 'rad', f: 1 },
    { id: 'gon', name: 'Gradian', sym: 'gon', f: Math.PI / 200 },
  ] },
];

const toBase = (u: Unit, v: number) => (u.toBase ? u.toBase(v) : v * (u.f ?? 1));
const fromBase = (u: Unit, b: number) => (u.fromBase ? u.fromBase(b) : b / (u.f ?? 1));
const convert = (from: Unit, to: Unit, v: number) => fromBase(to, toBase(from, v));

function fmt(n: number, dp: number | 'auto'): string {
  if (!isFinite(n)) return '∞';
  if (n === 0) return '0';
  if (dp === 'auto') {
    if (Math.abs(n) < 1e-6 || Math.abs(n) >= 1e15) return n.toExponential(6).replace(/\.?0+e/, 'e');
    return Number(n.toPrecision(10)).toLocaleString('en-US', { maximumFractionDigits: 10 });
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

interface FavPair { cat: string; from: string; to: string }
interface HistItem extends FavPair { val: string; ts: number }
const FAV_KEY = 'unit-converter-favs';
const HIST_KEY = 'unit-converter-history';

function ConverterInner() {
  const params = useSearchParams();
  const [catKey, setCatKey] = useState('length');
  const [fromId, setFromId] = useState('m');
  const [toId, setToId] = useState('ft');
  const [input, setInput] = useState('1');
  const [dp, setDp] = useState<number | 'auto'>('auto');
  const [search, setSearch] = useState('');
  const [favs, setFavs] = useState<FavPair[]>([]);
  const [hist, setHist] = useState<HistItem[]>([]);
  const [copied, setCopied] = useState('');

  const cat = useMemo(() => CATEGORIES.find((c) => c.key === catKey) || CATEGORIES[0], [catKey]);
  const fromUnit = useMemo(() => cat.units.find((u) => u.id === fromId) || cat.units[0], [cat, fromId]);
  const toUnit = useMemo(() => cat.units.find((u) => u.id === toId) || cat.units[1] || cat.units[0], [cat, toId]);
  const val = parseFloat(input.replace(',', '.'));
  const hasVal = input.trim() !== '' && !isNaN(val);
  const result = hasVal ? convert(fromUnit, toUnit, val) : NaN;

  // Đọc localStorage + tham số URL khi tải
  useEffect(() => {
    try { const f = localStorage.getItem(FAV_KEY); if (f) setFavs(JSON.parse(f)); } catch {}
    try { const h = localStorage.getItem(HIST_KEY); if (h) setHist(JSON.parse(h)); } catch {}
    const c = params.get('cat'); const fr = params.get('from'); const to = params.get('to'); const v = params.get('val');
    const found = CATEGORIES.find((x) => x.key === c);
    if (found) {
      setCatKey(found.key);
      if (found.units.some((u) => u.id === fr)) setFromId(fr!);
      if (found.units.some((u) => u.id === to)) setToId(to!);
      if (v != null) setInput(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đổi danh mục → chọn 2 đơn vị đầu, xoá tìm kiếm
  function pickCategory(key: string) {
    const c = CATEGORIES.find((x) => x.key === key)!;
    setCatKey(key); setFromId(c.units[0].id); setToId(c.units[1]?.id || c.units[0].id); setSearch('');
  }
  function swap() { setFromId(toId); setToId(fromId); }

  // Lưu lịch sử (debounce 1.2s) khi có giá trị hợp lệ
  useEffect(() => {
    if (!hasVal) return;
    const t = setTimeout(() => {
      setHist((prev) => {
        const item: HistItem = { cat: catKey, from: fromId, to: toId, val: input, ts: Date.now() };
        const filtered = prev.filter((h) => !(h.cat === item.cat && h.from === item.from && h.to === item.to && h.val === item.val));
        const next = [item, ...filtered].slice(0, 12);
        try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catKey, fromId, toId, input]);

  const isFav = favs.some((f) => f.cat === catKey && f.from === fromId && f.to === toId);
  function toggleFav() {
    setFavs((prev) => {
      const exists = prev.some((f) => f.cat === catKey && f.from === fromId && f.to === toId);
      const next = exists
        ? prev.filter((f) => !(f.cat === catKey && f.from === fromId && f.to === toId))
        : [{ cat: catKey, from: fromId, to: toId }, ...prev].slice(0, 20);
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function loadPair(p: FavPair, v?: string) {
    setCatKey(p.cat); setFromId(p.from); setToId(p.to); if (v != null) setInput(v); setSearch('');
  }
  function clearHist() { setHist([]); try { localStorage.removeItem(HIST_KEY); } catch {} }

  const flash = useCallback((id: string) => { setCopied(id); setTimeout(() => setCopied(''), 1200); }, []);
  function copyText(text: string, id: string) { navigator.clipboard?.writeText(text).then(() => flash(id)).catch(() => {}); }
  function share() {
    const url = `${window.location.origin}/converter?cat=${catKey}&from=${fromId}&to=${toId}&val=${encodeURIComponent(input)}`;
    copyText(url, 'share');
  }

  const unitName = (catK: string, id: string) => {
    const c = CATEGORIES.find((x) => x.key === catK); const u = c?.units.find((x) => x.id === id); return u ? u.sym : id;
  };

  // Lọc đơn vị theo tìm kiếm (áp dụng cho danh sách "tất cả đơn vị")
  const q = search.trim().toLowerCase();
  const filteredUnits = q
    ? cat.units.filter((u) => u.name.toLowerCase().includes(q) || u.sym.toLowerCase().includes(q))
    : cat.units;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 p-6 text-white shadow-card">
        <div className="flex items-center gap-2">
          <Ruler />
          <div>
            <h1 className="text-2xl font-bold">Chuyển đổi đơn vị</h1>
            <p className="text-sm text-white/90">Đổi nhanh giữa các đơn vị đo lường phổ biến — tức thì, chính xác.</p>
          </div>
        </div>
      </header>

      {/* Danh mục */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => pickCategory(c.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${c.key === catKey ? 'bg-brand-600 text-white' : 'bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Bộ chuyển đổi chính */}
      <section className="card space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          {/* Nguồn */}
          <div>
            <label className="text-xs text-ink-500">Từ</label>
            <input type="number" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)}
              className="input mt-1 text-lg font-semibold" placeholder="Nhập giá trị" />
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input mt-2">
              {cat.units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.sym})</option>)}
            </select>
          </div>
          {/* Hoán đổi */}
          <button onClick={swap} title="Hoán đổi" className="mx-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-ink-800 dark:hover:bg-ink-700 sm:mb-1">
            <ArrowRightLeft size={18} className="rotate-90 sm:rotate-0" />
          </button>
          {/* Đích */}
          <div>
            <label className="text-xs text-ink-500">Sang</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 dark:border-ink-700 dark:bg-ink-800/50">
              <span className="flex-1 truncate text-lg font-bold text-brand-600">{hasVal ? fmt(result, dp) : '—'}</span>
              <button onClick={() => copyText(hasVal ? String(fmt(result, dp)) : '', 'main')} title="Sao chép kết quả" className="text-ink-400 hover:text-brand-600">
                {copied === 'main' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="input mt-2">
              {cat.units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.sym})</option>)}
            </select>
          </div>
        </div>

        {hasVal && (
          <p className="text-center text-sm text-ink-500">
            <b>{fmt(val, dp)}</b> {fromUnit.sym} = <b className="text-brand-600">{fmt(result, dp)}</b> {toUnit.sym}
          </p>
        )}

        {/* Thanh công cụ */}
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
          <label className="flex items-center gap-1 text-sm text-ink-500">Làm tròn
            <select value={String(dp)} onChange={(e) => setDp(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} className="input !py-1 !w-auto">
              <option value="auto">Tự động</option>
              {[0, 1, 2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n} số lẻ</option>)}
            </select>
          </label>
          <button onClick={toggleFav} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm ${isFav ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'btn-outline'}`}>
            <Star size={15} className={isFav ? 'fill-amber-400 text-amber-500' : ''} /> {isFav ? 'Đã lưu' : 'Yêu thích'}
          </button>
          <button onClick={share} className="btn-outline flex items-center gap-1 !py-1.5 text-sm">
            {copied === 'share' ? <><Check size={15} className="text-emerald-500" /> Đã copy link</> : <><Share2 size={15} /> Chia sẻ</>}
          </button>
        </div>
      </section>

      {/* Chuyển đổi sang TẤT CẢ đơn vị + tìm kiếm */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Quy đổi sang mọi đơn vị</h2>
          <div className="relative w-44">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm đơn vị…" className="input !py-1.5 pl-8 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {filteredUnits.map((u) => {
            const v = hasVal ? convert(fromUnit, u, val) : NaN;
            const text = hasVal ? String(fmt(v, dp)) : '';
            return (
              <button key={u.id} onClick={() => copyText(text, 'u' + u.id)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${u.id === toId ? 'border-brand-400 bg-brand-50/60 dark:bg-ink-800' : 'border-ink-200/70 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50'}`}>
                <span className="min-w-0"><span className="text-ink-500">{u.name}</span> <span className="text-ink-400">({u.sym})</span></span>
                <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                  {hasVal ? fmt(v, dp) : '—'}
                  {copied === 'u' + u.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-ink-300" />}
                </span>
              </button>
            );
          })}
          {filteredUnits.length === 0 && <p className="col-span-full py-4 text-center text-sm text-ink-400">Không tìm thấy đơn vị.</p>}
        </div>
      </section>

      {/* Yêu thích */}
      {favs.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 flex items-center gap-1.5 font-semibold"><Star size={16} className="text-amber-500" /> Cặp yêu thích</h2>
          <div className="flex flex-wrap gap-2">
            {favs.map((f, i) => (
              <button key={i} onClick={() => loadPair(f)} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                {unitName(f.cat, f.from)} → {unitName(f.cat, f.to)}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lịch sử */}
      {hist.length > 0 && (
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-semibold"><HistoryIcon size={16} /> Lịch sử gần đây</h2>
            <button onClick={clearHist} className="flex items-center gap-1 text-xs text-ink-400 hover:text-rose-500"><Trash2 size={13} /> Xoá</button>
          </div>
          <div className="space-y-1">
            {hist.map((h, i) => {
              const c = CATEGORIES.find((x) => x.key === h.cat);
              const fu = c?.units.find((u) => u.id === h.from); const tu = c?.units.find((u) => u.id === h.to);
              const res = fu && tu ? fmt(convert(fu, tu, parseFloat(h.val.replace(',', '.'))), 'auto') : '';
              return (
                <button key={i} onClick={() => loadPair(h, h.val)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <span className="truncate text-ink-600 dark:text-ink-300">{h.val} {fu?.sym} → {tu?.sym}</span>
                  <span className="shrink-0 font-medium text-brand-600">{res} {tu?.sym}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ConverterPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <ConverterInner />
    </Suspense>
  );
}
