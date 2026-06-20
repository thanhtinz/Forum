'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, ChevronDown, MapPin, Droplets, Wind, Loader2, RefreshCw } from 'lucide-react';

interface DayForecast { date: string; code: number; tmax: number; tmin: number }
interface WeatherData {
  temp: number; code: number; humidity: number; wind: number;
  daily: DayForecast[];
}

// Mã thời tiết WMO -> emoji + mô tả tiếng Việt
function wmo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Trời quang' };
  if (code <= 2) return { icon: '🌤️', label: 'Ít mây' };
  if (code === 3) return { icon: '☁️', label: 'Nhiều mây' };
  if (code <= 48) return { icon: '🌫️', label: 'Sương mù' };
  if (code <= 57) return { icon: '🌦️', label: 'Mưa phùn' };
  if (code <= 67) return { icon: '🌧️', label: 'Mưa' };
  if (code <= 77) return { icon: '🌨️', label: 'Tuyết' };
  if (code <= 82) return { icon: '🌦️', label: 'Mưa rào' };
  if (code <= 86) return { icon: '🌨️', label: 'Mưa tuyết' };
  if (code <= 99) return { icon: '⛈️', label: 'Dông' };
  return { icon: '🌡️', label: 'Không rõ' };
}

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HANOI = { lat: 21.0285, lon: 105.8542 };

export function WeatherMenu({ mobile = false }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<WeatherData | null>(null);
  const [place, setPlace] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const fetched = useRef(false);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true); setErr('');
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`);
      const j = await r.json();
      const daily: DayForecast[] = (j.daily?.time || []).map((t: string, i: number) => ({
        date: t, code: j.daily.weather_code[i], tmax: Math.round(j.daily.temperature_2m_max[i]), tmin: Math.round(j.daily.temperature_2m_min[i]),
      }));
      setData({
        temp: Math.round(j.current?.temperature_2m ?? 0),
        code: j.current?.weather_code ?? 0,
        humidity: j.current?.relative_humidity_2m ?? 0,
        wind: Math.round(j.current?.wind_speed_10m ?? 0),
        daily,
      });
      // Tên khu vực (best-effort, không chặn)
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`)
        .then((res) => res.json())
        .then((g) => setPlace(g.city || g.locality || g.principalSubdivision || 'Vị trí của bạn'))
        .catch(() => setPlace('Vị trí của bạn'));
    } catch {
      setErr('Không tải được thời tiết');
    } finally { setLoading(false); }
  }, []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) { fetchWeather(HANOI.lat, HANOI.lon); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(HANOI.lat, HANOI.lon),
      { timeout: 8000, maximumAge: 600000 },
    );
  }, [fetchWeather]);

  useEffect(() => {
    if (open && !fetched.current) { fetched.current = true; locate(); }
  }, [open, locate]);

  const cur = data ? wmo(data.code) : null;

  const Panel = (
    <div className={mobile
      ? 'mt-1 rounded-xl border border-white/15 bg-white p-3 text-ink-700 dark:bg-ink-800 dark:text-ink-200'
      : 'absolute left-0 top-full z-50 mt-1 w-72 rounded-xl bg-white p-3 text-ink-700 shadow-lg dark:bg-ink-800 dark:text-ink-200'}>
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-500"><Loader2 size={16} className="animate-spin" /> Đang lấy thời tiết…</div>
      ) : err ? (
        <div className="space-y-2 py-3 text-center text-sm text-rose-500">{err}<button onClick={locate} className="mx-auto flex items-center gap-1 text-xs text-brand-600"><RefreshCw size={12} /> Thử lại</button></div>
      ) : data && cur ? (
        <>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={13} /> {place || '…'}</span>
            <button onClick={locate} title="Làm mới" className="text-ink-400 hover:text-brand-600"><RefreshCw size={13} /></button>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-4xl">{cur.icon}</span>
            <div>
              <div className="text-2xl font-bold">{data.temp}°C</div>
              <div className="text-xs text-ink-500">{cur.label}</div>
            </div>
            <div className="ml-auto space-y-0.5 text-right text-xs text-ink-500">
              <div className="flex items-center justify-end gap-1"><Droplets size={12} /> {data.humidity}%</div>
              <div className="flex items-center justify-end gap-1"><Wind size={12} /> {data.wind} km/h</div>
            </div>
          </div>

          <button onClick={() => setExpanded((e) => !e)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-ink-100 py-1.5 text-xs font-medium hover:bg-ink-200 dark:bg-ink-700 dark:hover:bg-ink-600">
            {expanded ? 'Thu gọn' : 'Xem dự báo 7 ngày'} <ChevronDown size={13} className={`transition ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="mt-2 space-y-1">
              {data.daily.map((d) => {
                const w = wmo(d.code);
                const dow = DOW[new Date(d.date).getDay()];
                return (
                  <div key={d.date} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm odd:bg-ink-50 dark:odd:bg-ink-700/40">
                    <span className="w-8 text-xs text-ink-500">{dow}</span>
                    <span className="text-lg">{w.icon}</span>
                    <span className="flex-1 truncate text-xs text-ink-500">{w.label}</span>
                    <span className="text-xs font-medium">{d.tmax}° <span className="text-ink-400">/ {d.tmin}°</span></span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );

  if (mobile) {
    return (
      <>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
          <span className="flex items-center gap-2"><Cloud size={16} /> Thời tiết {data && `· ${data.temp}°C`}</span>
          <ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && Panel}
      </>
    );
  }

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
        <Cloud size={16} /> {data ? `${data.temp}°C` : 'Thời tiết'} <ChevronDown size={13} />
      </button>
      {open && Panel}
    </div>
  );
}
