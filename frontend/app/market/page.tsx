'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Search, Star, X, Bell, BellOff, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

// ───────── Danh mục tài sản (mã theo Yahoo Finance) ─────────
type Item = { symbol: string; name: string };
const CATS: { key: string; label: string; items: Item[] }[] = [
  { key: 'crypto', label: 'Tiền điện tử', items: [
    { symbol: 'BTC-USD', name: 'Bitcoin' }, { symbol: 'ETH-USD', name: 'Ethereum' }, { symbol: 'SOL-USD', name: 'Solana' },
    { symbol: 'BNB-USD', name: 'BNB' }, { symbol: 'XRP-USD', name: 'XRP' }, { symbol: 'DOGE-USD', name: 'Dogecoin' },
    { symbol: 'ADA-USD', name: 'Cardano' }, { symbol: 'TON11419-USD', name: 'Toncoin' }, { symbol: 'AVAX-USD', name: 'Avalanche' },
    { symbol: 'DOT-USD', name: 'Polkadot' }, { symbol: 'TRX-USD', name: 'TRON' }, { symbol: 'LINK-USD', name: 'Chainlink' },
    { symbol: 'MATIC-USD', name: 'Polygon' }, { symbol: 'SHIB-USD', name: 'Shiba Inu' }, { symbol: 'LTC-USD', name: 'Litecoin' },
    { symbol: 'BCH-USD', name: 'Bitcoin Cash' }, { symbol: 'UNI-USD', name: 'Uniswap' }, { symbol: 'ATOM-USD', name: 'Cosmos' },
    { symbol: 'XLM-USD', name: 'Stellar' }, { symbol: 'NEAR-USD', name: 'NEAR' }, { symbol: 'APT-USD', name: 'Aptos' },
    { symbol: 'ARB-USD', name: 'Arbitrum' }, { symbol: 'OP-USD', name: 'Optimism' }, { symbol: 'SUI-USD', name: 'Sui' },
    { symbol: 'INJ-USD', name: 'Injective' }, { symbol: 'FIL-USD', name: 'Filecoin' }, { symbol: 'ICP-USD', name: 'Internet Computer' },
    { symbol: 'HBAR-USD', name: 'Hedera' }, { symbol: 'VET-USD', name: 'VeChain' }, { symbol: 'PEPE24478-USD', name: 'Pepe' },
  ] },
  { key: 'us', label: 'Cổ phiếu Mỹ', items: [
    { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' }, { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'GOOGL', name: 'Alphabet' }, { symbol: 'AMZN', name: 'Amazon' }, { symbol: 'META', name: 'Meta' },
    { symbol: 'TSLA', name: 'Tesla' }, { symbol: 'BRK-B', name: 'Berkshire Hathaway' }, { symbol: 'AMD', name: 'AMD' },
    { symbol: 'NFLX', name: 'Netflix' }, { symbol: 'JPM', name: 'JPMorgan' }, { symbol: 'V', name: 'Visa' },
    { symbol: 'MA', name: 'Mastercard' }, { symbol: 'WMT', name: 'Walmart' }, { symbol: 'COST', name: 'Costco' },
    { symbol: 'DIS', name: 'Disney' }, { symbol: 'KO', name: 'Coca-Cola' }, { symbol: 'PEP', name: 'PepsiCo' },
    { symbol: 'XOM', name: 'ExxonMobil' }, { symbol: 'JNJ', name: 'Johnson & Johnson' }, { symbol: 'ORCL', name: 'Oracle' },
    { symbol: 'ADBE', name: 'Adobe' }, { symbol: 'CRM', name: 'Salesforce' }, { symbol: 'INTC', name: 'Intel' },
    { symbol: 'BA', name: 'Boeing' }, { symbol: 'NKE', name: 'Nike' }, { symbol: 'MCD', name: "McDonald's" },
    { symbol: 'BABA', name: 'Alibaba' }, { symbol: 'PLTR', name: 'Palantir' }, { symbol: 'COIN', name: 'Coinbase' },
  ] },
  { key: 'vn', label: 'Cổ phiếu VN', items: [
    { symbol: 'VIC.VN', name: 'Vingroup' }, { symbol: 'VHM.VN', name: 'Vinhomes' }, { symbol: 'VRE.VN', name: 'Vincom Retail' },
    { symbol: 'VNM.VN', name: 'Vinamilk' }, { symbol: 'FPT.VN', name: 'FPT' }, { symbol: 'HPG.VN', name: 'Hòa Phát' },
    { symbol: 'VCB.VN', name: 'Vietcombank' }, { symbol: 'BID.VN', name: 'BIDV' }, { symbol: 'CTG.VN', name: 'VietinBank' },
    { symbol: 'TCB.VN', name: 'Techcombank' }, { symbol: 'MBB.VN', name: 'MB Bank' }, { symbol: 'ACB.VN', name: 'ACB' },
    { symbol: 'VPB.VN', name: 'VPBank' }, { symbol: 'HDB.VN', name: 'HDBank' }, { symbol: 'MWG.VN', name: 'Thế Giới Di Động' },
    { symbol: 'MSN.VN', name: 'Masan' }, { symbol: 'GAS.VN', name: 'PV Gas' }, { symbol: 'PLX.VN', name: 'Petrolimex' },
    { symbol: 'SSI.VN', name: 'Chứng khoán SSI' }, { symbol: 'VND.VN', name: 'VNDirect' }, { symbol: 'POW.VN', name: 'PV Power' },
    { symbol: 'SAB.VN', name: 'Sabeco' }, { symbol: 'VJC.VN', name: 'Vietjet' }, { symbol: 'PNJ.VN', name: 'PNJ' },
    { symbol: 'DGC.VN', name: 'Hóa chất Đức Giang' }, { symbol: 'GVR.VN', name: 'Cao su VN' },
  ] },
  { key: 'index', label: 'Chỉ số', items: [
    { symbol: '^GSPC', name: 'S&P 500' }, { symbol: '^IXIC', name: 'Nasdaq' }, { symbol: '^DJI', name: 'Dow Jones' },
    { symbol: '^RUT', name: 'Russell 2000' }, { symbol: '^VIX', name: 'VIX (sợ hãi)' }, { symbol: '^VNINDEX', name: 'VN-Index' },
    { symbol: '^N225', name: 'Nikkei 225' }, { symbol: '^HSI', name: 'Hang Seng' }, { symbol: '000001.SS', name: 'Shanghai' },
    { symbol: '^KS11', name: 'KOSPI (Hàn)' }, { symbol: '^TWII', name: 'Taiwan' }, { symbol: '^BSESN', name: 'BSE Sensex (Ấn)' },
    { symbol: '^FTSE', name: 'FTSE 100 (Anh)' }, { symbol: '^GDAXI', name: 'DAX (Đức)' }, { symbol: '^FCHI', name: 'CAC 40 (Pháp)' },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50' }, { symbol: '^AXJO', name: 'ASX 200 (Úc)' },
  ] },
  { key: 'metal', label: 'Kim loại', items: [
    { symbol: 'GC=F', name: 'Vàng' }, { symbol: 'SI=F', name: 'Bạc' }, { symbol: 'PL=F', name: 'Bạch kim' },
    { symbol: 'PA=F', name: 'Palladium' }, { symbol: 'HG=F', name: 'Đồng' }, { symbol: 'ALI=F', name: 'Nhôm' },
  ] },
  { key: 'energy', label: 'Năng lượng', items: [
    { symbol: 'CL=F', name: 'Dầu WTI' }, { symbol: 'BZ=F', name: 'Dầu Brent' }, { symbol: 'NG=F', name: 'Khí đốt' },
    { symbol: 'RB=F', name: 'Xăng (RBOB)' }, { symbol: 'HO=F', name: 'Dầu sưởi' },
  ] },
  { key: 'forex', label: 'Ngoại tệ', items: [
    { symbol: 'USDVND=X', name: 'USD/VND' }, { symbol: 'EURUSD=X', name: 'EUR/USD' }, { symbol: 'GBPUSD=X', name: 'GBP/USD' },
    { symbol: 'USDJPY=X', name: 'USD/JPY' }, { symbol: 'USDCNY=X', name: 'USD/CNY' }, { symbol: 'AUDUSD=X', name: 'AUD/USD' },
    { symbol: 'USDCAD=X', name: 'USD/CAD' }, { symbol: 'USDCHF=X', name: 'USD/CHF' }, { symbol: 'NZDUSD=X', name: 'NZD/USD' },
    { symbol: 'USDKRW=X', name: 'USD/KRW' }, { symbol: 'USDSGD=X', name: 'USD/SGD' }, { symbol: 'USDTHB=X', name: 'USD/THB' },
    { symbol: 'EURJPY=X', name: 'EUR/JPY' }, { symbol: 'DX-Y.NYB', name: 'Chỉ số USD (DXY)' },
  ] },
  { key: 'bond', label: 'Trái phiếu', items: [
    { symbol: '^IRX', name: 'Lợi suất TP Mỹ 13 tuần' }, { symbol: '^FVX', name: 'Lợi suất TP Mỹ 5 năm' },
    { symbol: '^TNX', name: 'Lợi suất TP Mỹ 10 năm' }, { symbol: '^TYX', name: 'Lợi suất TP Mỹ 30 năm' },
    { symbol: 'TLT', name: 'iShares TP 20+ năm' }, { symbol: 'IEF', name: 'iShares TP 7-10 năm' },
    { symbol: 'SHY', name: 'iShares TP 1-3 năm' }, { symbol: 'BND', name: 'Vanguard Total Bond' },
    { symbol: 'AGG', name: 'iShares Core US Bond' }, { symbol: 'HYG', name: 'TP lợi suất cao' }, { symbol: 'LQD', name: 'TP doanh nghiệp' },
  ] },
  { key: 'etf', label: 'ETF', items: [
    { symbol: 'SPY', name: 'SPDR S&P 500' }, { symbol: 'VOO', name: 'Vanguard S&P 500' }, { symbol: 'IVV', name: 'iShares S&P 500' },
    { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq)' }, { symbol: 'VTI', name: 'Vanguard Total Market' }, { symbol: 'DIA', name: 'SPDR Dow Jones' },
    { symbol: 'IWM', name: 'iShares Russell 2000' }, { symbol: 'GLD', name: 'Vàng ETF' }, { symbol: 'SLV', name: 'Bạc ETF' },
    { symbol: 'USO', name: 'Dầu ETF' }, { symbol: 'ARKK', name: 'ARK Innovation' }, { symbol: 'VEA', name: 'Thị trường phát triển' },
    { symbol: 'VWO', name: 'Thị trường mới nổi' }, { symbol: 'E1VFVN30.VN', name: 'VFM VN30 (VN)' },
  ] },
];
const ALL_ITEMS: Record<string, Item> = {};
CATS.forEach((c) => c.items.forEach((it) => { ALL_ITEMS[it.symbol] = it; }));

const TFS: { key: string; label: string }[] = [
  { key: '1m', label: '1 phút' }, { key: '5m', label: '5 phút' }, { key: '1h', label: '1 giờ' },
  { key: '1d', label: '1 ngày' }, { key: '1wk', label: '1 tuần' }, { key: '1mo', label: '1 tháng' },
];

interface Quote { symbol: string; price: number | null; prevClose: number | null; change: number | null; changePct: number | null; currency: string | null; spark: number[] }
interface Detail { symbol: string; currency: string | null; price: number | null; prevClose: number | null; change: number | null; changePct: number | null; open: number | null; dayHigh: number | null; dayLow: number | null; volume: number | null; exchange: string | null; tf: string; points: { t: number; o: number | null; h: number | null; l: number | null; c: number | null; v: number | null }[] }

const WATCH_KEY = 'market.watchlist';
const ALERT_KEY = 'market.alerts';

function fmtPrice(v: number | null | undefined, cur?: string | null) {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  const s = v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return cur === 'VND' ? `${s}₫` : s;
}
function fmtBig(v: number | null | undefined) {
  if (v == null) return '—';
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  return String(v);
}

// Sparkline / biểu đồ đường bằng SVG (nhẹ, không thư viện)
function Spark({ data, up, w = 96, h = 30 }: { data: number[]; up: boolean; w?: number; h?: number }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={up ? '#16a34a' : '#dc2626'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function LineChartSvg({ points, up }: { points: { t: number; c: number | null }[]; up: boolean }) {
  const data = points.map((p) => p.c).filter((x): x is number => x != null);
  const W = 640, H = 240, PAD = 8;
  if (data.length < 2) return <div className="grid h-60 place-items-center text-sm text-ink-400">Không đủ dữ liệu để vẽ biểu đồ</div>;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - min) / range) * (H - 2 * PAD);
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`;
  const color = up ? '#16a34a' : '#dc2626';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full" preserveAspectRatio="none">
      <polygon points={area} fill={color} fillOpacity={0.08} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function MarketPage() {
  const [catIdx, setCatIdx] = useState(0);
  const [showWatch, setShowWatch] = useState(false);
  const [page, setPage] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [watch, setWatch] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Record<string, { above?: number; below?: number }>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);

  // Tải watchlist + alerts từ localStorage
  useEffect(() => {
    try { setWatch(JSON.parse(localStorage.getItem(WATCH_KEY) || '[]')); } catch { /* noop */ }
    try { setAlerts(JSON.parse(localStorage.getItem(ALERT_KEY) || '{}')); } catch { /* noop */ }
  }, []);
  const saveWatch = (list: string[]) => { setWatch(list); localStorage.setItem(WATCH_KEY, JSON.stringify(list)); };
  const saveAlerts = (a: typeof alerts) => { setAlerts(a); localStorage.setItem(ALERT_KEY, JSON.stringify(a)); };

  const allSymbols = useMemo(() => {
    if (showWatch) return watch;
    return CATS[catIdx].items.map((i) => i.symbol);
  }, [showWatch, watch, catIdx]);

  const PER_PAGE = 10;
  const pageCount = Math.max(1, Math.ceil(allSymbols.length / PER_PAGE));
  const curPage = Math.min(page, pageCount - 1);
  // Chỉ hiển thị + tải giá cho 10 mã của trang hiện tại
  const visibleSymbols = useMemo(
    () => allSymbols.slice(curPage * PER_PAGE, curPage * PER_PAGE + PER_PAGE),
    [allSymbols, curPage],
  );

  // Đổi danh mục / watchlist → về trang 1
  useEffect(() => { setPage(0); }, [catIdx, showWatch]);

  // Kiểm tra cảnh báo khi có giá mới
  const checkAlerts = useCallback((qs: Record<string, Quote>) => {
    const a = { ...alerts };
    let changed = false;
    for (const [sym, cfg] of Object.entries(a)) {
      const price = qs[sym]?.price;
      if (price == null) continue;
      const hitAbove = cfg.above != null && price >= cfg.above;
      const hitBelow = cfg.below != null && price <= cfg.below;
      if (hitAbove || hitBelow) {
        const name = ALL_ITEMS[sym]?.name || sym;
        const dir = hitAbove ? `≥ ${cfg.above}` : `≤ ${cfg.below}`;
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Cảnh báo giá · Live Market', { body: `${name} (${sym}) đã ${dir}. Giá hiện tại: ${fmtPrice(price)}` });
          }
        } catch { /* noop */ }
        delete a[sym]; changed = true;
      }
    }
    if (changed) saveAlerts(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  const load = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) { setQuotes({}); return; }
    setLoading(true);
    try {
      const data = await api.get<Quote[]>(`/market/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
      const map: Record<string, Quote> = {};
      data.forEach((qd) => { map[qd.symbol] = qd; });
      setQuotes((prev) => ({ ...prev, ...map }));
      setUpdatedAt(Date.now());
      checkAlerts(map);
    } catch { /* giữ dữ liệu cũ */ } finally { setLoading(false); }
  }, [checkAlerts]);

  // Tải + tự refresh mỗi 20s
  useEffect(() => {
    load(visibleSymbols);
    const iv = setInterval(() => load(visibleSymbols), 20000);
    return () => clearInterval(iv);
  }, [visibleSymbols, load]);

  // Tìm kiếm (debounce)
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ symbol: string; name: string }[]>(`/market/search?q=${encodeURIComponent(q.trim())}`);
        setResults(r.map((x) => ({ symbol: x.symbol, name: x.name })));
      } catch { setResults([]); } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const toggleWatch = (sym: string) => saveWatch(watch.includes(sym) ? watch.filter((s) => s !== sym) : [...watch, sym]);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><LineChart /> Live Market</h1>
        <p className="mt-1 text-white/85">Theo dõi giá crypto, cổ phiếu, chỉ số, kim loại, năng lượng, ngoại tệ… theo thời gian thực.</p>
      </header>

      {/* Tìm kiếm */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã (vd: apple, btc, gold, vingroup)…"
          className="input w-full pl-9" />
        {q && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
            {searching && <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink-500"><Loader2 size={14} className="animate-spin" /> Đang tìm…</div>}
            {!searching && results.length === 0 && <div className="px-4 py-3 text-sm text-ink-500">Không tìm thấy.</div>}
            {results.map((r) => (
              <button key={r.symbol} onClick={() => { setSel(r.symbol); setQ(''); setResults([]); }}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                <span className="truncate"><b>{r.symbol}</b> · {r.name}</span>
                <ArrowUpRight size={14} className="shrink-0 text-ink-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs danh mục + Watchlist */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowWatch(true)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${showWatch ? 'bg-amber-500 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
          <Star size={14} /> Yêu thích ({watch.length})
        </button>
        {CATS.map((c, i) => (
          <button key={c.key} onClick={() => { setShowWatch(false); setCatIdx(i); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${!showWatch && catIdx === i ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {c.label}
          </button>
        ))}
        <button onClick={() => load(visibleSymbols)} className="ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {updatedAt ? new Date(updatedAt).toLocaleTimeString('vi') : 'Làm mới'}
        </button>
      </div>

      {/* Danh sách giá */}
      <div className="card divide-y divide-ink-100 overflow-hidden dark:divide-ink-800">
        {visibleSymbols.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-500">{showWatch ? 'Chưa có mã yêu thích. Bấm ⭐ ở mỗi mã để thêm.' : 'Trống.'}</div>
        )}
        {visibleSymbols.map((sym) => {
          const qd = quotes[sym];
          const name = ALL_ITEMS[sym]?.name || sym;
          const up = (qd?.changePct ?? 0) >= 0;
          return (
            <div key={sym} className="flex items-center gap-3 px-3 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/50">
              <button onClick={() => toggleWatch(sym)} className="shrink-0 text-ink-300 hover:text-amber-500" aria-label="watch">
                <Star size={16} className={watch.includes(sym) ? 'fill-amber-400 text-amber-400' : ''} />
              </button>
              <button onClick={() => setSel(sym)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="truncate text-xs text-ink-400">{sym}</p>
                </div>
                <div className="hidden sm:block">{qd && <Spark data={qd.spark} up={up} />}</div>
                <div className="w-28 shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{qd ? fmtPrice(qd.price, qd.currency) : <Loader2 size={14} className="ml-auto animate-spin text-ink-400" />}</p>
                  {qd?.changePct != null && (
                    <p className={`flex items-center justify-end gap-0.5 text-xs font-medium tabular-nums ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {up ? '+' : ''}{qd.changePct.toFixed(2)}%
                    </p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Phân trang — 10 mã/trang */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => setPage(Math.max(0, curPage - 1))} disabled={curPage === 0}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-ink-700">‹ Trước</button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-medium ${i === curPage ? 'bg-brand-600 text-white' : 'border border-ink-200 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800'}`}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => setPage(Math.min(pageCount - 1, curPage + 1))} disabled={curPage === pageCount - 1}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-ink-700">Sau ›</button>
        </div>
      )}

      <p className="text-center text-xs text-ink-400">Dữ liệu từ Yahoo Finance · có thể trễ vài phút tùy sàn · không phải lời khuyên đầu tư.</p>

      {sel && <DetailModal symbol={sel} onClose={() => setSel(null)} inWatch={watch.includes(sel)} onToggleWatch={() => toggleWatch(sel)}
        alert={alerts[sel]} onSetAlert={(a) => { const next = { ...alerts }; if (a) next[sel] = a; else delete next[sel]; saveAlerts(next); }} />}
    </div>
  );
}

function DetailModal({ symbol, onClose, inWatch, onToggleWatch, alert, onSetAlert }: {
  symbol: string; onClose: () => void; inWatch: boolean; onToggleWatch: () => void;
  alert?: { above?: number; below?: number }; onSetAlert: (a: { above?: number; below?: number } | null) => void;
}) {
  const [tf, setTf] = useState('1d');
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [above, setAbove] = useState(alert?.above != null ? String(alert.above) : '');
  const [below, setBelow] = useState(alert?.below != null ? String(alert.below) : '');
  const name = ALL_ITEMS[symbol]?.name || symbol;

  useEffect(() => {
    let alive = true; setLoading(true); setErr('');
    api.get<Detail>(`/market/chart?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
      .then((r) => { if (alive) setD(r); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol, tf]);

  // tự refresh chi tiết mỗi 20s
  useEffect(() => {
    const iv = setInterval(() => {
      api.get<Detail>(`/market/chart?symbol=${encodeURIComponent(symbol)}&tf=${tf}`).then(setD).catch(() => {});
    }, 20000);
    return () => clearInterval(iv);
  }, [symbol, tf]);

  const up = (d?.changePct ?? 0) >= 0;

  async function saveAlert() {
    if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch { /* noop */ } }
    const a: { above?: number; below?: number } = {};
    if (above.trim()) a.above = Number(above);
    if (below.trim()) a.below = Number(below);
    onSetAlert(Object.keys(a).length ? a : null);
    setShowAlert(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{name} <span className="text-sm font-normal text-ink-400">{symbol}{d?.exchange ? ` · ${d.exchange}` : ''}</span></h2>
            <div className="mt-0.5 flex items-end gap-2">
              <span className="text-2xl font-bold tabular-nums">{fmtPrice(d?.price, d?.currency)}</span>
              {d?.changePct != null && (
                <span className={`flex items-center gap-0.5 pb-1 text-sm font-semibold tabular-nums ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {up ? '+' : ''}{fmtPrice(d?.change, d?.currency)} ({up ? '+' : ''}{d.changePct.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button onClick={onToggleWatch} className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800" title="Yêu thích">
              <Star size={18} className={inWatch ? 'fill-amber-400 text-amber-400' : 'text-ink-400'} />
            </button>
            <button onClick={() => setShowAlert((s) => !s)} className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800" title="Cảnh báo giá">
              {alert ? <Bell size={18} className="fill-brand-500 text-brand-500" /> : <Bell size={18} className="text-ink-400" />}
            </button>
            <button onClick={onClose} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={18} /></button>
          </div>
        </div>

        {/* Cài cảnh báo */}
        {showAlert && (
          <div className="mb-3 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
            <p className="mb-2 text-sm font-medium">Cảnh báo khi giá vượt ngưỡng (thông báo trình duyệt khi mở trang)</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-1">≥ <input value={above} onChange={(e) => setAbove(e.target.value)} type="number" className="input w-28 !py-1" placeholder="giá trên" /></label>
              <label className="flex items-center gap-1">≤ <input value={below} onChange={(e) => setBelow(e.target.value)} type="number" className="input w-28 !py-1" placeholder="giá dưới" /></label>
              <button onClick={saveAlert} className="btn-primary !py-1.5 text-xs">Lưu cảnh báo</button>
              {alert && <button onClick={() => { onSetAlert(null); setAbove(''); setBelow(''); setShowAlert(false); }} className="btn-outline !py-1.5 text-xs"><BellOff size={13} /> Xoá</button>}
            </div>
          </div>
        )}

        {/* Khung thời gian */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {TFS.map((t) => (
            <button key={t.key} onClick={() => setTf(t.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${tf === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Biểu đồ */}
        <div className="rounded-xl border border-ink-200/70 p-2 dark:border-ink-800">
          {loading ? <div className="grid h-60 place-items-center"><Loader2 className="animate-spin text-ink-400" /></div>
            : err ? <div className="grid h-60 place-items-center text-sm text-rose-500">{err}</div>
            : d ? <LineChartSvg points={d.points} up={up} /> : null}
        </div>

        {/* OHLC + khối lượng */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Stat label="Mở cửa" value={fmtPrice(d?.open, d?.currency)} />
          <Stat label="Cao nhất" value={fmtPrice(d?.dayHigh, d?.currency)} />
          <Stat label="Thấp nhất" value={fmtPrice(d?.dayLow, d?.currency)} />
          <Stat label="Đóng cửa trước" value={fmtPrice(d?.prevClose, d?.currency)} />
          <Stat label="Khối lượng" value={fmtBig(d?.volume)} />
          <Stat label="Tiền tệ" value={d?.currency || '—'} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/50">
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
