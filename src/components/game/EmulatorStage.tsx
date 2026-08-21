'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Download, Expand, Loader2, LogOut, Pause, Play, RotateCw,
  Save, Settings2, Smartphone, Timer, Upload, Volume2, VolumeX,
} from 'lucide-react';
import {
  DEFAULT_GAMEPAD_MAP, javaKeyCode, mergeKeymap, type EmuKey,
} from '@/lib/emulator-keys';
import { cn } from '@/lib/utils';
import { KeymapEditor } from './KeymapEditor';
import { useKeypadParts } from './VirtualKeypad';

// ── Kiểu dữ liệu phiên (khớp POST /api/games/{id}/play) ──

interface SessionProfile {
  id: string; slug: string; name: string;
  screenWidth: number; screenHeight: number; orientation: string;
  cldc: string; midp: string; keyLayout: string;
  softKeys: boolean; audio: boolean; rms: boolean; saveState: boolean;
  keymap: Record<string, string> | null;
  runtimeUrl: string | null;
  sessionMaxSec: number; idleTimeoutSec: number;
}

interface SessionData {
  sessionId: string;
  status: string;
  queuePosition: number | null;
  expiresAt: string;
  heartbeatSec: number;
  profile: SessionProfile;
  game: { id: string; slug: string; title: string };
  version: { id: string; version: string };
  jarUrl: string;
  jadUrl: string | null;
  checksum: string | null;
}

export interface EmulatorStageProps {
  slug: string;
  gameTitle: string;
  versionId?: string;
  profileId?: string;
  /** Keymap người dùng đã lưu cho profile này (nếu đã đăng nhập). */
  savedKeymap?: Record<string, string> | null;
  loggedIn: boolean;
  /**
   * Chiếm trọn màn hình. Bật theo thiết bị (điện thoại) chứ không theo bề ngang
   * cửa sổ — xoay ngang máy vẫn phải là toàn màn hình.
   */
  fullscreen?: boolean;
}

type Phase = 'creating' | 'queued' | 'loading' | 'running' | 'paused' | 'reconnecting' | 'ended' | 'error';

/** Khoá localStorage lưu tiến trình "Continue Playing" phía trình duyệt. */
const CONTINUE_KEY = 'nova:games:continue';
const CONTINUE_MAX = 12;

/**
 * Sân khấu emulator: tạo phiên, nạp runtime trong iframe sandbox, chuyển input
 * của người dùng thành Java key code và giữ nhịp heartbeat cho Session Manager.
 *
 * Runtime J2ME thật chạy ở dịch vụ riêng (`EmulatorProfile.runtimeUrl`), không
 * chung process với web server. Trang chỉ nói chuyện với nó qua postMessage.
 */
export function EmulatorStage({ slug, gameTitle, versionId, profileId, savedKeymap, loggedIn, fullscreen: fill = false }: EmulatorStageProps) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closedRef = useRef(false);

  const startedRef = useRef(false);
  // Keymap đã lưu chỉ đọc một lần lúc tạo phiên — giữ trong ref để prop đổi
  // identity giữa các lần render không kích hoạt tạo phiên mới.
  const savedKeymapRef = useRef(savedKeymap);

  const [session, setSession] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<Phase>('creating');
  const [message, setMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [playedSec, setPlayedSec] = useState(0);
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [keymap, setKeymap] = useState<Record<string, EmuKey>>(() => mergeKeymap(null, savedKeymapRef.current));
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const profile = session?.profile;
  // Trạng thái báo lên server (dùng trong heartbeat) — giữ trong ref để interval luôn đọc bản mới.
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  // ── Gửi lệnh xuống runtime ──────────────────────────────
  const post = useCallback((msg: Record<string, unknown>) => {
    // Runtime chạy trong iframe sandbox (origin `null`) nên phải dùng '*';
    // đổi lại, chiều nhận luôn kiểm tra event.source.
    frameRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  const sendKey = useCallback((key: EmuKey, action: 'down' | 'up') => {
    post({ type: 'nova:key', action, key, code: javaKeyCode(key) });
    setHeld((prev) => {
      const next = new Set(prev);
      if (action === 'down') next.add(key); else next.delete(key);
      return next;
    });
  }, [post]);

  // ── 1. Tạo phiên (đúng một lần cho mỗi lần mở trang) ────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/games/${slug}/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId, profileId }),
        });
        const data = (await res.json()) as SessionData & { error?: string; message?: string };
        if (!alive) return;
        if (!res.ok) {
          setPhase('error');
          setMessage(data.message ?? 'Không tạo được phiên chơi.');
          return;
        }
        setSession(data);
        setQueuePos(data.queuePosition);
        setPhase(data.queuePosition ? 'queued' : 'loading');
        setRemaining(Math.max(0, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
        setKeymap(mergeKeymap(data.profile.keymap, savedKeymapRef.current));
        rememberContinue({ slug, title: data.game.title, versionId: data.version.id, at: Date.now() });
      } catch {
        if (alive) { setPhase('error'); setMessage('Lỗi mạng khi tạo phiên chơi.'); }
      }
    })();
    return () => { alive = false; };
  }, [slug, versionId, profileId]);

  // ── 2. Nhận thông điệp từ runtime ───────────────────────
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const data = e.data as { type?: string; message?: string; data?: string };
      switch (data?.type) {
        case 'nova:ready':
          if (session) {
            post({
              type: 'nova:init',
              jarUrl: session.jarUrl,
              jadUrl: session.jadUrl,
              checksum: session.checksum,
              profile: session.profile,
            });
          }
          break;
        case 'nova:started':
          setPhase('running');
          break;
        case 'nova:paused':
          setPhase('paused');
          break;
        case 'nova:error':
          setPhase('error');
          setMessage(data.message ?? 'Runtime báo lỗi.');
          break;
        case 'nova:state':
          if (data.data) void persistState(data.data);
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, post]);

  // ── 2b. Khoá cuộn nền ───────────────────────────────────
  // Sân khấu phủ kín màn hình điện thoại, để trang phía sau cuộn được thì
  // ngón tay trượt hụt sẽ kéo cả trang.
  useEffect(() => {
    if (!fill) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [fill]);

  // ── 3. Heartbeat ────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const reportable: Record<string, string> = {
      loading: 'LOADING', running: 'RUNNING', paused: 'PAUSED', reconnecting: 'RECONNECTING', error: 'ERROR',
    };

    const beat = async () => {
      if (closedRef.current) return;
      try {
        const res = await fetch(`/api/emulator/sessions/${session.sessionId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: reportable[phaseRef.current] }),
        });
        if (!res.ok) { setPhase('reconnecting'); return; }
        const data = (await res.json()) as { status: string; remainingSec: number; playedSec: number; queuePosition: number | null };
        setRemaining(data.remainingSec);
        setPlayedSec(data.playedSec);
        setQueuePos(data.queuePosition);
        if (data.status === 'EXPIRED' || data.status === 'CLOSED') {
          closedRef.current = true;
          setPhase('ended');
          setMessage(data.status === 'EXPIRED' ? 'Phiên chơi đã hết thời gian.' : 'Phiên chơi đã kết thúc.');
          post({ type: 'nova:control', action: 'stop' });
        } else if (data.status === 'LOADING' && phaseRef.current === 'queued') {
          setPhase('loading');
        }
      } catch {
        setPhase('reconnecting');
      }
    };

    void beat();
    const id = setInterval(beat, session.heartbeatSec * 1000);
    return () => clearInterval(id);
  }, [session, post]);

  // ── 4. Đồng hồ đếm ngược cục bộ ─────────────────────────
  useEffect(() => {
    if (phase === 'ended' || phase === 'error') return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── 5. Đóng phiên khi rời trang ─────────────────────────
  useEffect(() => {
    if (!session) return;
    const close = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      navigator.sendBeacon?.(`/api/emulator/sessions/${session.sessionId}/close`);
    };
    window.addEventListener('pagehide', close);
    return () => { window.removeEventListener('pagehide', close); close(); };
  }, [session]);

  // ── 6. Bàn phím PC ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' && phase !== 'loading') return;
    const down = (e: KeyboardEvent) => {
      const key = keymap[e.code];
      if (!key) return;
      if (e.repeat) return;
      e.preventDefault();
      sendKey(key, 'down');
    };
    const up = (e: KeyboardEvent) => {
      const key = keymap[e.code];
      if (!key) return;
      e.preventDefault();
      sendKey(key, 'up');
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [keymap, phase, sendKey]);

  // ── 7. Gamepad API ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running') return;
    if (typeof navigator.getGamepads !== 'function') return;
    let raf = 0;
    const prev = new Set<EmuKey>();
    const poll = () => {
      const pads = navigator.getGamepads();
      const pad = pads && Array.from(pads).find(Boolean);
      if (pad) {
        const now = new Set<EmuKey>();
        pad.buttons.forEach((b, i) => {
          const key = DEFAULT_GAMEPAD_MAP[i];
          if (key && b.pressed) now.add(key);
        });
        // Trục analog trái cũng lái D-pad.
        const [x = 0, y = 0] = pad.axes;
        if (x < -0.5) now.add('LEFT'); else if (x > 0.5) now.add('RIGHT');
        if (y < -0.5) now.add('UP'); else if (y > 0.5) now.add('DOWN');

        for (const k of now) if (!prev.has(k)) sendKey(k, 'down');
        for (const k of prev) if (!now.has(k)) sendKey(k, 'up');
        prev.clear();
        now.forEach((k) => prev.add(k));
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [phase, sendKey]);

  // ── Điều khiển ──────────────────────────────────────────
  const control = (action: string, payload?: unknown) => post({ type: 'nova:control', action, payload });

  const togglePause = () => {
    if (phase === 'running') { control('pause'); setPhase('paused'); }
    else if (phase === 'paused') { control('resume'); setPhase('running'); }
  };

  const toggleMute = () => { setMuted((m) => { control(m ? 'unmute' : 'mute'); return !m; }); };

  const reset = () => { control('reset'); setPhase('loading'); };

  const fullscreen = () => {
    const el = document.getElementById('nova-emulator-stage');
    if (!document.fullscreenElement) void el?.requestFullscreen?.();
    else void document.exitFullscreen();
  };

  const exit = async () => {
    if (session && !closedRef.current) {
      closedRef.current = true;
      await fetch(`/api/emulator/sessions/${session.sessionId}/close`, { method: 'POST' }).catch(() => {});
    }
    router.push(`/games/${slug}`);
  };

  /** Lưu RMS/state: có tài khoản thì lên cloud, khách thì để trong trình duyệt. */
  const persistState = async (base64: string) => {
    if (!session) return;
    if (loggedIn) {
      const res = await fetch(`/api/emulator/sessions/${session.sessionId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: profile?.saveState ? 'STATE' : 'RMS', slot: 0, data: base64 }),
      }).catch(() => null);
      setSaveNote(res?.ok ? 'Đã lưu lên tài khoản' : 'Lưu thất bại');
    } else {
      try {
        localStorage.setItem(`nova:save:${session.version.id}`, base64);
        setSaveNote('Đã lưu trong trình duyệt');
      } catch {
        setSaveNote('Trình duyệt không cho lưu');
      }
    }
    setTimeout(() => setSaveNote(null), 2500);
  };

  const requestSave = () => control('saveState');

  const requestLoad = async () => {
    if (!session) return;
    let data: string | null = null;
    if (loggedIn) {
      const res = await fetch(
        `/api/emulator/sessions/${session.sessionId}/state?kind=${profile?.saveState ? 'STATE' : 'RMS'}&slot=0`,
      ).catch(() => null);
      const json = res && res.ok ? ((await res.json()) as { data: string | null }) : null;
      data = json?.data ?? null;
    } else {
      data = localStorage.getItem(`nova:save:${session.version.id}`);
    }
    if (!data) { setSaveNote('Chưa có bản lưu nào'); setTimeout(() => setSaveNote(null), 2500); return; }
    control('loadState', data);
    setSaveNote('Đã nạp bản lưu');
    setTimeout(() => setSaveNote(null), 2500);
  };

  // ── Kích thước màn hình ảo ──────────────────────────────
  const screen = useMemo(() => {
    const w = profile?.screenWidth ?? 240;
    const h = profile?.screenHeight ?? 320;
    return landscape ? { w: h, h: w } : { w, h };
  }, [profile, landscape]);

  /**
   * Khung game phải vừa khít chỗ trống mà vẫn đúng tỉ lệ máy ảo.
   * `aspect-ratio` của CSS không làm được: khi `max-width` cắt bớt chiều ngang
   * thì chiều cao không co theo, ảnh game bị kéo méo. Nên đo bằng JS.
   */
  const areaRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const fit = () => {
      const { width, height } = area.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const scale = Math.min(width / screen.w, height / screen.h);
      setBox({ w: Math.floor(screen.w * scale), h: Math.floor(screen.h * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    return () => ro.disconnect();
  }, [screen.w, screen.h]);

  /** Máy cầm ngang: chiều cao eo hẹp nên chuyển bàn phím ra hai bên màn hình. */
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 520px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const keypad = useKeypadParts({
    keyLayout: profile?.keyLayout ?? 'generic',
    softKeys: profile?.softKeys ?? true,
    onPress: (k) => sendKey(k, 'down'),
    onRelease: (k) => sendKey(k, 'up'),
    held,
    compact: fill && wide,
  });

  const busy = phase === 'creating' || phase === 'loading' || phase === 'queued' || phase === 'reconnecting';

  // ── Các mảnh dùng chung cho cả hai bố cục ───────────────

  const screenBox = (
    <div
      className="relative overflow-hidden rounded-lg bg-black ring-1 ring-ink-700"
      style={box.w > 0 ? { width: box.w, height: box.h } : { width: '100%', aspectRatio: `${screen.w} / ${screen.h}` }}
    >
      {session?.profile.runtimeUrl ? (
        <iframe
          ref={frameRef}
          title={`Emulator ${gameTitle}`}
          src={session.profile.runtimeUrl}
          // Runtime bị cô lập: không cho điều hướng top-level, không cho form/popup.
          sandbox="allow-scripts"
          allow="autoplay; fullscreen; gamepad"
          className="h-full w-full border-0"
        />
      ) : (
        <div className="grid h-full w-full place-items-center p-3 text-center">
          <div>
            <canvas
              width={screen.w}
              height={screen.h}
              className="mx-auto max-h-24 opacity-20"
              style={{ imageRendering: 'pixelated' }}
            />
            <p className="mt-3 text-xs text-ink-400">
              Emulator profile này chưa gắn runtime (<code>runtimeUrl</code>).
              <br />Bạn vẫn tải JAR/JAD về máy để chơi trên thiết bị thật.
            </p>
          </div>
        </div>
      )}

      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-3 text-center text-sm">
          <div>
            <Loader2 className="mx-auto animate-spin text-brand-400" size={26} />
            <p className="mt-2">
              {phase === 'creating' && 'Đang tạo phiên chơi…'}
              {phase === 'queued' && `Đang xếp hàng${queuePos ? ` — vị trí ${queuePos}` : ''}…`}
              {phase === 'loading' && 'Đang nạp MIDlet…'}
              {phase === 'reconnecting' && 'Mất kết nối, đang thử lại…'}
            </p>
          </div>
        </div>
      )}

      {(phase === 'ended' || phase === 'error') && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-4 text-center text-sm">
          <div>
            <AlertTriangle className="mx-auto text-amber-400" size={26} />
            <p className="mt-2">{message ?? 'Phiên chơi đã kết thúc.'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => router.refresh()} className="btn-primary !py-1.5 text-xs">
                <Play size={13} /> Chơi lại
              </button>
              <Link href={`/games/${slug}`} className="btn-outline !py-1.5 text-xs !text-ink-200">
                <Download size={13} /> Tải về máy
              </Link>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <Pause size={40} className="text-white/80" />
        </div>
      )}
    </div>
  );

  const controls = (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      <Ctl onClick={togglePause} disabled={phase !== 'running' && phase !== 'paused'} label={phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}>
        {phase === 'paused' ? <Play size={16} /> : <Pause size={16} />}
      </Ctl>
      <Ctl onClick={reset} disabled={!session} label="Khởi động lại"><RotateCw size={16} /></Ctl>
      <Ctl onClick={toggleMute} disabled={!profile?.audio} label={muted ? 'Bật tiếng' : 'Tắt tiếng'}>
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Ctl>
      <Ctl onClick={() => setLandscape((v) => !v)} label="Xoay màn hình">
        <Smartphone size={16} className={landscape ? 'rotate-90' : ''} />
      </Ctl>
      <Ctl onClick={fullscreen} label="Toàn màn hình"><Expand size={16} /></Ctl>
      {(profile?.rms || profile?.saveState) && (
        <>
          <Ctl onClick={requestSave} disabled={phase !== 'running'} label="Lưu"><Save size={16} /></Ctl>
          <Ctl onClick={requestLoad} disabled={!session} label="Nạp bản lưu"><Upload size={16} /></Ctl>
        </>
      )}
      <Ctl onClick={() => setShowSettings((v) => !v)} label="Cấu hình phím"><Settings2 size={16} /></Ctl>
      <Ctl onClick={exit} label="Thoát" danger><LogOut size={16} /></Ctl>
    </div>
  );

  const topBar = (
    <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold sm:text-base">{gameTitle}</p>
        {!(fill && wide) && (
          <p className="truncate text-[11px] text-ink-400">
            {profile ? `${profile.name} · CLDC ${profile.cldc} / MIDP ${profile.midp}` : 'Đang chuẩn bị…'}
            {session && ` · v${session.version.version}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs">
        <span className={cn('flex items-center gap-1 rounded-full px-2 py-1',
          session && remaining < 120 ? 'bg-red-500/20 text-red-300' : 'bg-ink-800 text-ink-300')}>
          <Timer size={13} /> {session ? fmtClock(remaining) : '--:--'}
        </span>
        <span className="hidden rounded-full bg-ink-800 px-2 py-1 text-ink-400 sm:inline">
          Đã chơi {fmtClock(playedSec)}
        </span>
      </div>
    </div>
  );

  return (
    /**
     * Trên điện thoại emulator chiếm trọn màn hình: không header/footer, chiều cao
     * 100dvh (tự trừ thanh địa chỉ trình duyệt) và chừa safe-area cho tai thỏ.
     * Cầm ngang thì bàn phím dạt ra hai bên để màn hình game còn chỗ.
     */
    <div
      id="nova-emulator-stage"
      className={cn(
        'touch-none select-none bg-ink-950 text-ink-100',
        fill
          ? 'fixed inset-0 z-50 flex h-[100dvh] flex-col px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]'
          : 'rounded-2xl p-4',
      )}
    >
      {topBar}

      {fill && wide ? (
        <>
          {/* Cầm ngang: D-pad · màn hình · bàn phím số */}
          {/* `items-stretch` để ô giữa có chiều cao xác định — nếu không, khung game
              tự quyết chiều cao rồi tràn khỏi màn hình. */}
          <div className="flex min-h-0 flex-1 items-stretch gap-2">
            <div className="shrink-0 self-center">{keypad.dpad}</div>
            <div ref={areaRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
              {screenBox}
            </div>
            <div className="shrink-0 self-center">{keypad.numpad}</div>
          </div>
          <div className="mt-2 flex shrink-0 items-center gap-2">
            <div className="min-w-0 flex-1">{keypad.softKeys}</div>
            {controls}
          </div>
        </>
      ) : (
        <>
          <div ref={areaRef} className={cn('flex items-center justify-center', fill ? 'min-h-0 flex-1' : 'h-[60vh]')}>
            {screenBox}
          </div>
          <div className="mt-2 sm:mt-3">{controls}</div>
          {saveNote && <p className="mt-1.5 shrink-0 text-center text-xs text-brand-300">{saveNote}</p>}
          <div className="mx-auto mt-2 w-full max-w-sm shrink-0 space-y-3 sm:mt-4">
            {keypad.softKeys}
            <div className="flex items-center justify-between gap-4">
              {keypad.dpad}
              {keypad.numpad}
            </div>
          </div>
        </>
      )}

      {/* Cấu hình phím — đè lên trên khi toàn màn hình, tự cuộn nếu dài */}
      {showSettings && profile && (
        <div className={cn('overflow-y-auto rounded-xl bg-ink-900 p-4',
          fill ? 'absolute inset-x-2 bottom-2 max-h-[70%] shadow-xl' : 'mt-4')}>
          <KeymapEditor
            profileId={profile.id}
            keymap={keymap}
            onChange={setKeymap}
            canPersist={loggedIn}
          />
        </div>
      )}
    </div>
  );
}

function Ctl({ onClick, children, label, disabled, danger }: {
  onClick: () => void; children: React.ReactNode; label: string; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={cn(
        // Nhỏ hơn một chút trên điện thoại để cả hàng nút vừa một dòng.
        'grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:opacity-40 sm:h-9 sm:w-9',
        danger ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
      )}
    >
      {children}
    </button>
  );
}

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

interface ContinueEntry { slug: string; title: string; versionId: string; at: number }

/** Ghi lại game vừa chơi để dựng mục "Continue Playing" cho cả khách lẫn thành viên. */
function rememberContinue(entry: ContinueEntry): void {
  try {
    const raw = localStorage.getItem(CONTINUE_KEY);
    const list = (raw ? (JSON.parse(raw) as ContinueEntry[]) : []).filter((e) => e.slug !== entry.slug);
    list.unshift(entry);
    localStorage.setItem(CONTINUE_KEY, JSON.stringify(list.slice(0, CONTINUE_MAX)));
  } catch {
    // localStorage bị chặn — bỏ qua, đây chỉ là tiện ích
  }
}
