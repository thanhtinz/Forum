// Rút gọn số tiền: 1.000 -> 1k, 1.000.000 -> 1m, 1.000.000.000 -> 1b
export function formatCoin(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return '0';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  const fmt = (x: number) => {
    const s = x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0);
    return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  };
  if (a >= 1e9) return `${sign}${fmt(a / 1e9)}b`;
  if (a >= 1e6) return `${sign}${fmt(a / 1e6)}m`;
  if (a >= 1e3) return `${sign}${fmt(a / 1e3)}k`;
  return `${sign}${a}`;
}

// Đếm ngược: số giây -> "2h 5m", "45m 10s", "30s"
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s <= 0) return 'Xong';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// Số giây còn lại tới mốc thời gian (ISO string / Date), tính theo "now" truyền vào
export function secondsUntil(target: string | Date | null | undefined, now: number): number {
  if (!target) return 0;
  const t = typeof target === 'string' ? new Date(target).getTime() : target.getTime();
  return Math.max(0, Math.floor((t - now) / 1000));
}
