'use client';

import { useMemo, useState } from 'react';

interface Point { date: string; count: number }

const WIDTH = 640;
const HEIGHT = 200;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 24;

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Biểu đồ đường "người dùng mới" 30 ngày — 1 chuỗi số liệu, không cần chú giải (tên đã nằm ở tiêu đề).
export function UserGrowthChart({ data }: { data: Point[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const { points, max, path, areaPath, plotW, plotH } = useMemo(() => {
    const plotW = WIDTH - PAD_L - PAD_R;
    const plotH = HEIGHT - PAD_T - PAD_B;
    const max = Math.max(1, ...data.map((d) => d.count));
    const step = data.length > 1 ? plotW / (data.length - 1) : 0;
    const pts = data.map((d, i) => ({
      x: PAD_L + i * step,
      y: PAD_T + plotH - (d.count / max) * plotH,
      ...d,
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = pts.length
      ? `${path} L${pts[pts.length - 1].x.toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`
      : '';
    return { points: pts, max, path, areaPath, plotW, plotH };
  }, [data]);

  if (!data.length) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-ink-400">Chưa có dữ liệu.</div>;
  }

  const gridLines = 4;
  const hover = hoverIdx != null ? points[hoverIdx] : null;
  // Nhãn trục ngang: chỉ hiện đầu / giữa / cuối để tránh chồng chữ
  const labelIdxs = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setHoverIdx(closest);
  }

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="ug-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ug-line)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--ug-line)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Lưới ngang mờ */}
          {Array.from({ length: gridLines + 1 }, (_, i) => {
            const y = PAD_T + (plotH / gridLines) * i;
            const val = Math.round(max - (max / gridLines) * i);
            return (
              <g key={i}>
                <line x1={PAD_L} x2={WIDTH - PAD_R} y1={y} y2={y} className="stroke-ink-200 dark:stroke-ink-800" strokeWidth={1} strokeDasharray="3 3" />
                <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="fill-ink-400 text-[9px]">{val}</text>
              </g>
            );
          })}

          {/* Vùng tô dưới đường */}
          <path d={areaPath} fill="url(#ug-fill)" style={{ ['--ug-line' as any]: 'rgb(46 90 128)' }} />
          {/* Đường số liệu */}
          <path d={path} fill="none" stroke="rgb(46 90 128)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-brand-400" />

          {/* Nhãn trục ngày (thưa) */}
          {points.map((p, i) => labelIdxs.has(i) && (
            <text key={i} x={p.x} y={HEIGHT - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="fill-ink-400 text-[9px]">
              {formatDate(p.date)}
            </text>
          ))}

          {/* Crosshair + điểm hover */}
          {hover && (
            <>
              <line x1={hover.x} x2={hover.x} y1={PAD_T} y2={PAD_T + plotH} className="stroke-ink-300 dark:stroke-ink-700" strokeWidth={1} />
              <circle cx={hover.x} cy={hover.y} r={4} fill="rgb(46 90 128)" className="dark:fill-brand-400" stroke="white" strokeWidth={1.5} />
            </>
          )}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs shadow-card dark:border-ink-700 dark:bg-ink-800"
            style={{ left: `${Math.min(85, Math.max(2, (hover.x / WIDTH) * 100))}%` }}
          >
            <div className="font-semibold text-ink-700 dark:text-ink-200">{hover.count} người dùng mới</div>
            <div className="text-ink-400">{formatDate(hover.date)}</div>
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowTable((v) => !v)} className="mt-2 text-xs text-brand-600 hover:underline dark:text-brand-400">
        {showTable ? 'Ẩn bảng số liệu' : 'Xem dạng bảng'}
      </button>
      {showTable && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-ink-200 dark:border-ink-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-ink-50 dark:bg-ink-800">
              <tr><th className="px-2 py-1 text-left">Ngày</th><th className="px-2 py-1 text-right">Người dùng mới</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="px-2 py-1">{formatDate(d.date)}</td>
                  <td className="px-2 py-1 text-right font-medium">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UserGrowthChart;
