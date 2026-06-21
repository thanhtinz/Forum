'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp, Music, X, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1,
  Shuffle, Plus, Trash2, Gauge, ListPlus,
} from 'lucide-react';
import { useDraggable } from '@/lib/useDraggable';

interface Track { kind: 'yt' | 'ytpl' | 'sp'; id: string; title: string; url: string; spType?: 'track' | 'playlist' | 'album' }
const LS_KEY = 'mini-player-playlist';

// Parse link YouTube (video/playlist) / Spotify (track/playlist/album) -> track
function parseUrl(raw: string): Track | null {
  const u = raw.trim();
  if (!u) return null;
  const isYouTube = /youtube\.com|youtu\.be/i.test(u);
  // YouTube — PLAYLIST: ưu tiên nếu link có tham số list= (kể cả watch?v=...&list=...)
  if (isYouTube) {
    const list = u.match(/[?&]list=([\w-]+)/);
    if (list) return { kind: 'ytpl', id: list[1], title: 'YouTube Playlist', url: u };
  }
  // YouTube — 1 video cụ thể
  const yt = u.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([\w-]{11})/);
  if (yt) return { kind: 'yt', id: yt[1], title: `YouTube • ${yt[1]}`, url: u };
  // Spotify — track / playlist / album
  const sp = u.match(/open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|playlist|album)\/([\w]+)/);
  if (sp) return { kind: 'sp', id: sp[2], spType: sp[1] as 'track' | 'playlist' | 'album', title: `Spotify ${sp[1]}`, url: u };
  return null;
}

// Lấy tiêu đề bài hát (noembed hỗ trợ CORS)
async function fetchTitle(url: string): Promise<string | null> {
  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const d = await r.json();
    return d?.title || null;
  } catch { return null; }
}

export function FloatingDock() {
  const [showTop, setShowTop] = useState(false);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Track[]>([]);
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const [shuffle, setShuffle] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [input, setInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [bulk, setBulk] = useState('');
  const [msg, setMsg] = useState('');

  const drag = useDraggable('music', { right: 16, bottom: 72 });

  const yt = useRef<any>(null);
  const ready = useRef(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef({ repeat, shuffle, list, cur });
  stateRef.current = { repeat, shuffle, list, cur };

  // hiện nút back-to-top khi cuộn
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // tải playlist đã lưu từ localStorage
  useEffect(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) setList(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} }, [list]);

  // nạp YouTube IFrame API + tạo player ẩn NGAY KHI MOUNT (để phát nền, không phụ thuộc panel mở)
  useEffect(() => {
    function init() {
      if (yt.current || !(window as any).YT?.Player) return;
      yt.current = new (window as any).YT.Player('mini-yt', {
        height: '0', width: '0',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1 },
        events: {
          onReady: () => { ready.current = true; yt.current.unMute(); yt.current.setVolume(100); },
          onStateChange: (e: any) => {
            const YT = (window as any).YT;
            if (e.data === YT.PlayerState.PLAYING) { setPlaying(true); setDuration(yt.current.getDuration() || 0); }
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) onEnded();
          },
        },
      });
    }
    if ((window as any).YT?.Player) init();
    else {
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api'; s.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(s);
      }
      (window as any).onYouTubeIframeAPIReady = init;
      const iv = setInterval(() => { if ((window as any).YT?.Player) { clearInterval(iv); init(); } }, 300);
      return () => clearInterval(iv);
    }
  }, []); // eslint-disable-line

  // theo dõi tiến độ
  useEffect(() => {
    tick.current = setInterval(() => {
      if (yt.current?.getCurrentTime && playing) {
        setProgress(yt.current.getCurrentTime() || 0);
        if (!duration) setDuration(yt.current.getDuration() || 0);
      }
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [playing, duration]);

  function onEnded() {
    const { repeat: rp, shuffle: sf, list: ls, cur: c } = stateRef.current;
    // Playlist YouTube tự động chuyển bài bên trong player — không tự nhảy entry ngoài.
    if (ls[c]?.kind === 'ytpl') { if (rp === 'one') { yt.current?.seekTo(0); yt.current?.playVideo(); } return; }
    if (rp === 'one') { yt.current?.seekTo(0); yt.current?.playVideo(); return; }
    if (sf && ls.length > 1) { let n = c; while (n === c) n = Math.floor(Math.random() * ls.length); playIndex(n); return; }
    if (c < ls.length - 1) playIndex(c + 1);
    else if (rp === 'all') playIndex(0);
    else setPlaying(false);
  }

  function playIndex(i: number) {
    const t = list[i]; if (!t) return;
    setCur(i); setProgress(0); setDuration(0);
    if (t.kind === 'yt' || t.kind === 'ytpl') {
      const start = () => {
        if (t.kind === 'ytpl') yt.current.loadPlaylist({ list: t.id, listType: 'playlist', index: 0 });
        else yt.current.loadVideoById(t.id);
        yt.current.unMute();                       // bỏ tắt tiếng (autoplay luôn bắt đầu ở chế độ muted)
        yt.current.setVolume(100);
        yt.current.setPlaybackRate(speed);
        setPlaying(true);
      };
      if (yt.current && ready.current) start();
      else { const iv = setInterval(() => { if (yt.current && ready.current) { clearInterval(iv); start(); } }, 200); }
    } else {
      // Spotify: phát qua embed iframe (điều khiển riêng); dừng YouTube
      if (yt.current?.pauseVideo) yt.current.pauseVideo();
      setPlaying(false);
    }
  }

  function togglePlay() {
    if (cur < 0 && list.length) { playIndex(0); return; }
    const t = list[cur];
    if ((t?.kind !== 'yt' && t?.kind !== 'ytpl') || !yt.current) return;
    if (playing) yt.current.pauseVideo(); else { yt.current.unMute(); yt.current.setVolume(100); yt.current.playVideo(); }
  }
  function prevTrack() {
    if (list[cur]?.kind === 'ytpl' && yt.current?.previousVideo) { yt.current.previousVideo(); return; }
    if (cur > 0) playIndex(cur - 1);
  }
  function nextTrack() {
    if (list[cur]?.kind === 'ytpl' && yt.current?.nextVideo) { yt.current.nextVideo(); return; }
    if (cur < list.length - 1) playIndex(cur + 1);
  }
  function changeSpeed(s: number) { setSpeed(s); yt.current?.setPlaybackRate?.(s); }
  function seek(v: number) { setProgress(v); yt.current?.seekTo?.(v, true); }

  async function add() {
    setMsg('');
    const t = parseUrl(input);
    if (!t) { setMsg('Link không hợp lệ. Hãy dán link video/playlist YouTube hoặc track/playlist/album Spotify.'); return; }
    const title = await fetchTitle(t.url);
    setList((l) => [...l, { ...t, title: title || t.title }]);
    setInput('');
  }

  // Import nhiều link cùng lúc (mỗi dòng / cách nhau bởi khoảng trắng hoặc dấu phẩy)
  async function importBulk() {
    setMsg('');
    const parts = bulk.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    const parsed = parts.map(parseUrl).filter(Boolean) as Track[];
    const failed = parts.length - parsed.length;
    if (!parsed.length) { setMsg(`Không nhận diện được link nào (${parts.length} dòng). Cần link YouTube/Spotify.`); return; }
    // thêm trước với tiêu đề tạm, rồi cập nhật tiêu đề thật dần
    setList((l) => [...l, ...parsed]);
    setBulk('');
    setImporting(false);
    setMsg(`Đã thêm ${parsed.length} mục${failed > 0 ? ` (bỏ qua ${failed} link không hợp lệ)` : ''}`);
    const titles = await Promise.all(parsed.map((t) => fetchTitle(t.url)));
    setList((l) => l.map((t) => {
      const idx = parsed.findIndex((p) => p.kind === t.kind && p.id === t.id && p.title === t.title);
      if (idx >= 0 && titles[idx]) return { ...t, title: titles[idx]! };
      return t;
    }));
  }

  function remove(i: number) {
    setList((l) => l.filter((_, idx) => idx !== i));
    if (i === cur) { setCur(-1); setPlaying(false); yt.current?.stopVideo?.(); }
    else if (i < cur) setCur((c) => c - 1);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const track = list[cur];

  return (
    <>
      {/* Player ẩn của YouTube — luôn tồn tại để phát nền */}
      <div className="pointer-events-none fixed -left-10 bottom-0 h-0 w-0 overflow-hidden"><div id="mini-yt" /></div>

      {/* Cụm nút nổi góc phải (xếp chồng): back-to-top DƯỚI CÙNG, nhạc trên, admin trên nữa */}
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Lên đầu trang"
          className="fixed bottom-4 right-4 z-40 grid h-11 w-11 place-items-center rounded-full bg-ink-800 text-white shadow-lg hover:bg-ink-900 dark:bg-ink-700">
          <ArrowUp size={20} />
        </button>
      )}
      {!open && (
        <button onPointerDown={drag.onPointerDown} onClick={() => { if (drag.movedRef.current) return; setOpen(true); }} title="Trình phát nhạc (giữ & kéo để di chuyển)"
          className={`z-40 grid h-11 w-11 cursor-grab place-items-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 ${drag.dragging ? 'cursor-grabbing scale-105' : ''}`}
          style={drag.style}>
          <Music size={20} />
        </button>
      )}

      {/* Bảng trình phát nhạc */}
      {open && (
        <div data-drag-panel style={drag.panelStyle(340, 480)} className="fixed z-40 w-[340px] max-w-[92vw] rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900">
          <div onPointerDown={drag.panelPointerDown} style={{ touchAction: 'none' }} className="flex cursor-grab items-center justify-between border-b border-ink-200 px-4 py-2.5 select-none active:cursor-grabbing dark:border-ink-800">
            <span className="flex items-center gap-1.5 text-sm font-bold text-brand-600"><Music size={16} /> Nhạc</span>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={16} /></button>
          </div>

          <div className="space-y-3 p-3">
            {/* Đang phát */}
            <div className="rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800/50">
              <div className="truncate text-sm font-medium">{track ? track.title : 'Chưa chọn bài'}</div>
              {track?.kind === 'sp' ? (
                <iframe title="spotify" className="mt-2 w-full rounded-lg" height={track.spType === 'track' ? 80 : 152} src={`https://open.spotify.com/embed/${track.spType || 'track'}/${track.id}`} allow="encrypted-media" />
              ) : (
                <>
                  <input type="range" min={0} max={duration || 0} value={progress} onChange={(e) => seek(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
                  <div className="flex justify-between text-[10px] text-ink-400"><span>{fmt(progress)}</span><span>{fmt(duration)}</span></div>
                </>
              )}
              {/* Điều khiển */}
              <div className="mt-1 flex items-center justify-center gap-3">
                <button onClick={() => setShuffle((s) => !s)} title="Ngẫu nhiên" className={shuffle ? 'text-brand-600' : 'text-ink-400'}><Shuffle size={16} /></button>
                <button onClick={prevTrack} className="text-ink-600 dark:text-ink-300"><SkipBack size={20} /></button>
                <button onClick={togglePlay} className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white">{playing ? <Pause size={20} /> : <Play size={20} />}</button>
                <button onClick={nextTrack} className="text-ink-600 dark:text-ink-300"><SkipForward size={20} /></button>
                <button onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} title="Lặp lại" className={repeat !== 'off' ? 'text-brand-600' : 'text-ink-400'}>
                  {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                </button>
              </div>
              {/* Tốc độ phát (âm lượng dùng nút loa trên thiết bị) */}
              <div className="mt-2 flex items-center justify-end gap-1 text-xs text-ink-500">
                <Gauge size={14} />
                <select value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} className="rounded border border-ink-200 bg-transparent text-xs dark:border-ink-700">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => <option key={s} value={s}>{s}x</option>)}
                </select>
              </div>
            </div>

            {/* Thêm bài + import playlist */}
            <div className="flex gap-1.5">
              <input className="input flex-1 text-sm" placeholder="Dán link bài / playlist YouTube / Spotify…" value={input}
                onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
              <button onClick={add} className="btn-outline px-2.5" title="Thêm bài"><Plus size={15} /></button>
              <button onClick={() => setImporting((v) => !v)} className={`btn-outline px-2.5 ${importing ? 'text-brand-600' : ''}`} title="Import playlist"><ListPlus size={15} /></button>
            </div>

            {importing && (
              <div className="space-y-1.5 rounded-lg border border-dashed border-ink-300 p-2 dark:border-ink-700">
                <p className="text-[11px] text-ink-500">Dán nhiều link (mỗi dòng một link, hoặc cách nhau dấu phẩy/khoảng trắng):</p>
                <textarea className="input min-h-[72px] text-xs" placeholder={'https://youtube.com/playlist?list=...\nhttps://youtu.be/...\nhttps://open.spotify.com/playlist/...'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
                <button onClick={importBulk} className="btn-primary w-full !py-1 text-sm"><ListPlus size={14} /> Import tất cả</button>
              </div>
            )}

            {msg && <p className="text-xs text-rose-500">{msg}</p>}

            {/* Playlist */}
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {list.length === 0 && <p className="py-3 text-center text-xs text-ink-400">Playlist trống — dán link để thêm.</p>}
              {list.map((t, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${i === cur ? 'bg-brand-50 dark:bg-ink-800' : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'}`}>
                  <button onClick={() => playIndex(i)} className="min-w-0 flex-1 truncate text-left">
                    <span className={`mr-1 text-[10px] ${t.kind === 'sp' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.kind === 'ytpl' ? 'YT≡' : t.kind === 'yt' ? 'YT' : 'SP'}</span>
                    {t.title}
                  </button>
                  <button onClick={() => remove(i)} className="text-ink-400 hover:text-rose-500"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
