import { Injectable, BadRequestException } from '@nestjs/common';

// Nguồn dữ liệu: Yahoo Finance (miễn phí, không cần key) — proxy qua backend để tránh CORS.
const YH_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ForumLiveMarket/1.0)' };

// Khung thời gian → (range, interval) của Yahoo
const TF: Record<string, { range: string; interval: string }> = {
  '1m': { range: '1d', interval: '1m' },
  '5m': { range: '5d', interval: '5m' },
  '1h': { range: '1mo', interval: '60m' },
  '1d': { range: '6mo', interval: '1d' },
  '1wk': { range: '2y', interval: '1wk' },
  '1mo': { range: '10y', interval: '1mo' },
};

export interface ChartPoint { t: number; o: number | null; h: number | null; l: number | null; c: number | null; v: number | null }

@Injectable()
export class MarketService {
  // path bắt đầu bằng '/' — thử lần lượt các host Yahoo cho chắc
  private async yfetch(path: string): Promise<any> {
    let lastErr: any;
    for (const host of YH_HOSTS) {
      try {
        const res = await fetch(host + path, { headers: UA });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        return await res.json();
      } catch (e) { lastErr = e; }
    }
    throw new BadRequestException('Không lấy được dữ liệu thị trường: ' + (lastErr?.message || 'lỗi mạng'));
  }

  // Lấy biểu đồ + thông tin tổng quan của 1 mã theo khung thời gian
  async chart(symbol: string, tf = '1d') {
    if (!symbol) throw new BadRequestException('Thiếu mã');
    const { range, interval } = TF[tf] || TF['1d'];
    const j = await this.yfetch(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
    const r = j?.chart?.result?.[0];
    if (!r) throw new BadRequestException('Không có dữ liệu cho mã này');
    const meta = r.meta || {};
    const ts: number[] = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    const points: ChartPoint[] = ts
      .map((t, i) => ({ t: t * 1000, o: q.open?.[i] ?? null, h: q.high?.[i] ?? null, l: q.low?.[i] ?? null, c: q.close?.[i] ?? null, v: q.volume?.[i] ?? null }))
      .filter((p) => p.c != null);
    const price = meta.regularMarketPrice ?? points.at(-1)?.c ?? null;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const change = price != null && prevClose != null ? price - prevClose : null;
    const changePct = change != null && prevClose ? (change / prevClose) * 100 : null;
    return {
      symbol: meta.symbol || symbol,
      currency: meta.currency ?? null,
      price,
      prevClose,
      change,
      changePct,
      open: meta.regularMarketOpen ?? points[0]?.o ?? null,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      volume: meta.regularMarketVolume ?? null,
      exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
      tf,
      points,
    };
  }

  // Báo giá nhanh nhiều mã (cho danh sách) — kèm sparkline trong ngày
  async quotes(symbols: string[]) {
    const list = symbols.map((s) => s.trim()).filter(Boolean).slice(0, 40);
    const out = await Promise.all(list.map(async (s) => {
      try {
        const c = await this.chart(s, '1d');
        return {
          symbol: s,
          price: c.price,
          prevClose: c.prevClose,
          change: c.change,
          changePct: c.changePct,
          currency: c.currency,
          spark: c.points.map((p) => p.c).filter((x): x is number => x != null).slice(-40),
        };
      } catch {
        return { symbol: s, price: null, prevClose: null, change: null, changePct: null, currency: null, spark: [] as number[] };
      }
    }));
    return out;
  }

  // Tìm kiếm mã
  async search(q: string) {
    if (!q?.trim()) return [];
    const j = await this.yfetch(`/v1/finance/search?q=${encodeURIComponent(q.trim())}&quotesCount=12&newsCount=0`);
    return (j?.quotes || [])
      .filter((x: any) => x.symbol)
      .map((x: any) => ({ symbol: x.symbol, name: x.shortname || x.longname || x.symbol, exchange: x.exchDisp || x.exchange || '', type: x.quoteType || '' }));
  }
}
