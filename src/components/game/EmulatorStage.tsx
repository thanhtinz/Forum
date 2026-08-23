'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Download, Expand, Loader2, LogOut, MoreVertical, Pause, Play,
  RotateCw, Save, Sliders, Smartphone, SmartphoneCharging, Timer, Upload,
  Volume2, VolumeX,
} from 'lucide-react';
import {
  DEFAULT_GAMEPAD_MAP, javaKeyCode, mergeKeymap, type EmuKey,
} from '@/lib/emulator-keys';
import {
  configStorageKey, DEFAULT_CONFIG, effectiveScreen, isCustomised, parseConfig,
  type EmulatorConfig,
} from '@/lib/emulator-config';
import { chassisSkin, faceLayout } from '@/lib/emulator-skin';
import { cn } from '@/lib/utils';
import { DevicePicker, type DeviceOption } from './DevicePicker';
import { EmulatorSettings } from './EmulatorSettings';
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
  /** Danh sách máy ảo người chơi được chọn, kèm mức tương thích với game này. */
  devices?: DeviceOption[];
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
export function EmulatorStage({ slug, gameTitle, versionId, profileId, savedKeymap, loggedIn, fullscreen: fill = false, devices = [] }: EmulatorStageProps) {
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
  /**
   * Xoay thủ công bằng nút — `null` là để mặc theo hướng thật của máy.
   * Xoay máy sẽ xoá lựa chọn thủ công, tránh cảnh cầm dọc mà màn hình game
   * cứ nằm ngang mãi vì lỡ bấm nút xoay một lần.
   */
  const [manualLandscape, setManualLandscape] = useState<boolean | null>(null);

  /**
   * Hướng thật của máy. Trước đây chỗ này đo `max-height: 520px` — một cách
   * đoán gián tiếp, hụt trên máy màn to nằm ngang và không ăn khớp với hướng
   * của màn hình ảo. Giờ hỏi thẳng `orientation`.
   */
  const [deviceLandscape, setDeviceLandscape] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const sync = () => {
      setDeviceLandscape(mq.matches);
      setManualLandscape(null);
    };
    setDeviceLandscape(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Bố cục bàn phím bám hướng cầm máy. Còn khung game thì giữ đúng hướng của
  // máy ảo (game Java gần như đều là game dọc) — chỉ xoay khi người chơi tự bấm.
  const wide = deviceLandscape;
  const landscape = manualLandscape ?? false;
  const [showMenu, setShowMenu] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<EmulatorConfig>(DEFAULT_CONFIG);
  // `nova:init` bắn ra từ listener không có config trong deps — đọc qua ref để
  // runtime luôn nhận bản cấu hình mới nhất ngay từ lúc khởi động.
  const configRef = useRef(config);
  configRef.current = config;
  const [savingConfig, setSavingConfig] = useState(false);
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

  /**
   * Rung nhẹ khi chạm phím ảo — chỉ cho phím trên màn hình, gõ bàn phím PC thì
   * không rung. Đọc cấu hình qua ref nên bật/tắt ăn ngay mà không dựng lại
   * handler. Máy không hỗ trợ (iOS Safari) thì `vibrate` trả về false chứ
   * không ném lỗi.
   */
  const buzz = useCallback(() => {
    if (!configRef.current.vibrate) return;
    navigator.vibrate?.(12);
  }, []);

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

  // ── 1b. Nạp cấu hình riêng của game ─────────────────────
  // Đăng nhập thì lấy theo tài khoản, khách thì lấy trong localStorage.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (loggedIn) {
        const res = await fetch(`/api/games/${slug}/config`).catch(() => null);
        if (res?.ok && alive) {
          const data = (await res.json()) as { config: unknown };
          setConfig(parseConfig(data.config));
          return;
        }
      }
      try {
        const raw = localStorage.getItem(configStorageKey(slug));
        if (raw && alive) setConfig(parseConfig(JSON.parse(raw)));
      } catch {
        // localStorage bị chặn hoặc dữ liệu hỏng — giữ mặc định
      }
    })();
    return () => { alive = false; };
  }, [slug, loggedIn]);

  /** Đổi cấu hình: áp dụng ngay, rồi lưu lại (tài khoản hoặc trình duyệt). */
  const updateConfig = useCallback((next: EmulatorConfig) => {
    setConfig(next);
    try {
      localStorage.setItem(configStorageKey(slug), JSON.stringify(next));
    } catch {
      // không lưu được thì thôi, cấu hình vẫn có hiệu lực trong phiên này
    }
    if (!loggedIn) return;
    setSavingConfig(true);
    void fetch(`/api/games/${slug}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => null).finally(() => setSavingConfig(false));
  }, [slug, loggedIn]);

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
              config: configRef.current,
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

  // ── 2c. Đẩy cấu hình xuống runtime ──────────────────────
  // Kích thước/scale/lọc ảnh trang tự áp được; fps, tốc độ, cỡ chữ, âm thanh
  // thì runtime phải tự xử lý theo giao ước `nova:config`.
  useEffect(() => {
    if (!session) return;
    post({ type: 'nova:config', config });
  }, [config, session, post]);

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
  const screen = useMemo(
    () => effectiveScreen(config, { width: profile?.screenWidth ?? 240, height: profile?.screenHeight ?? 320 }, landscape),
    [config, profile, landscape],
  );

  /**
   * Khung game phải vừa khít chỗ trống mà vẫn đúng tỉ lệ máy ảo.
   * `aspect-ratio` của CSS không làm được: khi `max-width` cắt bớt chiều ngang
   * thì chiều cao không co theo, ảnh game bị kéo méo. Nên đo bằng JS.
   */
  /** Cầm dọc toàn màn hình — lúc này mới dựng thân máy. */
  const portraitChassis = fill && !wide;
  /** Màu thân máy theo hãng của máy ảo đang chọn. */
  const skin = chassisSkin(profile?.slug, profile?.keyLayout);
  /** Bố cục mặt phím theo dòng máy — S60, QWERTY, cảm ứng… bày phím khác nhau. */
  const face = faceLayout(profile?.slug, profile?.keyLayout);
  /**
   * Thân máy chia cho màn hình bao nhiêu là tuỳ dòng máy: máy cảm ứng gần như
   * toàn màn hình, mặt trước chỉ còn dải ba phím; máy phím thì theo tỉ lệ mặt
   * trước Nokia 6300 (màn hình ~57%, bàn phím ~40%).
   */
  // Mọi dòng máy giờ dùng chung một mặt phím (mũi tên · số · Options · Back)
  // nên chia thân máy như nhau; chỉ dáng cụm điều hướng là khác.
  //
  // Chia ngược so với trước: **bàn phím lấy đúng chiều cao nó cần**, kính màn
  // hình ăn tất cả phần còn lại. Hai cách chia kia đều hỏng — chia theo tỉ lệ
  // cố định thì kính không chạm tới bàn phím (nhìn như màn hình bé hơn thân
  // máy), còn cho kính giữ tỉ lệ máy ảo ở full bề ngang thì nó cao 513px và
  // bóp phím số xuống 21px, chữ số đè lên chữ cái.
  const split = { top: 'flex-1', bottom: 'shrink-0' };

  const areaRef = useRef<HTMLDivElement>(null);
  /** Viền kính bao quanh khung game (chỉ có khi dựng thân máy). */
  const bezelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const scaling = config.scaling;

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const fit = () => {
      // `areaRef` nằm bên trong kính nên rect của nó đã trừ sẵn viền và padding.
      const rect = area.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width <= 0 || height <= 0) return;
      if (scaling === 'stretch') {
        // Kéo đầy khung, chấp nhận méo tỉ lệ.
        setBox({ w: Math.floor(width), h: Math.floor(height) });
        return;
      }
      // `original` giữ đúng pixel gốc, chỉ thu nhỏ khi màn hình ảo lớn hơn chỗ trống.
      const scale = scaling === 'original'
        ? Math.min(1, width / screen.w, height / screen.h)
        : Math.min(width / screen.w, height / screen.h);
      setBox({ w: Math.floor(screen.w * scale), h: Math.floor(screen.h * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    return () => ro.disconnect();
  }, [screen.w, screen.h, scaling, portraitChassis]);

  const keypad = useKeypadParts({
    keyLayout: profile?.keyLayout ?? 'generic',
    softKeys: profile?.softKeys ?? true,
    onPress: (k) => { buzz(); sendKey(k, 'down'); },
    onRelease: (k) => sendKey(k, 'up'),
    held,
    compact: fill && wide,
    // Cầm dọc toàn màn hình: mặt phím chiếm trọn nửa dưới.
    fill: fill && !wide,
    // Toàn màn hình thì cả hai hướng đều dựng theo skin thân máy.
    skinned: fill,
    keyTone: skin.keys,
    accent: skin.accent,
    faceLayout: face,
  });

  const busy = phase === 'creating' || phase === 'loading' || phase === 'queued' || phase === 'reconnecting';

  // ── Các mảnh dùng chung cho cả hai bố cục ───────────────

  const screenBox = (
    <div
      // Trong thân máy thì kính đã là viền rồi: khung game vẽ thêm vành sáng
      // và bo góc nữa là hiện ra một hình chữ nhật lọt thỏm giữa kính, nhìn
      // đúng kiểu "màn hình bé hơn khung máy". Ngoài thân máy mới cần vành.
      className={cn('relative overflow-hidden bg-black', fill ? 'rounded-none' : 'rounded-lg ring-1 ring-ink-700')}
      style={{
        ...(box.w > 0 ? { width: box.w, height: box.h } : { width: '100%', aspectRatio: `${screen.w} / ${screen.h}` }),
        // Máy cổ nên để pixel vuông; ai thích mượt thì đổi trong cấu hình game.
        imageRendering: config.filter === 'sharp' ? 'pixelated' : 'auto',
      }}
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
        <div className="absolute inset-0 grid place-items-center bg-ink-950/95 p-3 text-center text-sm">
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

  /**
   * Mọi nút điều khiển gom vào menu ⋮ ở góc trên. Hàng nút ngang cũ ăn mất một
   * dải chiều cao mà màn hình game đang rất cần, lại toàn biểu tượng không nhãn.
   */
  const menuItems: MenuItem[] = [
    {
      icon: phase === 'paused' ? <Play size={16} /> : <Pause size={16} />,
      label: phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng',
      onClick: togglePause,
      disabled: phase !== 'running' && phase !== 'paused',
    },
    { icon: <RotateCw size={16} />, label: 'Khởi động lại', onClick: reset, disabled: !session },
    {
      icon: muted ? <VolumeX size={16} /> : <Volume2 size={16} />,
      label: muted ? 'Bật tiếng' : 'Tắt tiếng',
      onClick: toggleMute,
      disabled: !profile?.audio,
    },
    {
      icon: <Smartphone size={16} className={landscape ? 'rotate-90' : ''} />,
      label: landscape ? 'Về màn hình dọc' : 'Xoay ngang màn hình',
      onClick: () => setManualLandscape(!landscape),
    },
    { icon: <Expand size={16} />, label: 'Toàn màn hình', onClick: fullscreen },
    ...(profile?.rms || profile?.saveState
      ? [
        { icon: <Save size={16} />, label: 'Lưu', onClick: requestSave, disabled: phase !== 'running' },
        { icon: <Upload size={16} />, label: 'Nạp bản lưu', onClick: requestLoad, disabled: !session },
      ]
      : []),
    ...(devices.length > 1
      ? [{
        icon: <SmartphoneCharging size={16} />,
        label: 'Chọn máy ảo',
        onClick: () => { setShowDevices(true); setShowConfig(false); },
      }]
      : []),
    {
      icon: <Sliders size={16} />,
      label: 'Cấu hình game',
      onClick: () => { setShowConfig(true); setShowDevices(false); },
      dot: isCustomised(config),
    },
    { icon: <LogOut size={16} />, label: 'Thoát', onClick: exit, danger: true },
  ];

  const menu = (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setShowMenu((v) => !v)}
        aria-label="Menu điều khiển"
        aria-expanded={showMenu}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg ring-1 ring-white/10 transition-colors',
          // Nền đen mờ chứ không phải một màu cứng: thân máy đổi màu theo hãng,
          // `bg-ink-800` trùng đúng màu vỏ Nokia nên nút tàng hình.
          showMenu ? 'bg-black/70 text-ink-100' : 'bg-black/45 text-ink-200 hover:bg-black/70',
        )}
      >
        <span className="relative">
          <MoreVertical size={18} />
          {isCustomised(config) && (
            <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-400" />
          )}
        </span>
      </button>

      {showMenu && (
        <>
          {/* Bấm ra ngoài để đóng */}
          <button
            type="button" aria-label="Đóng menu" onClick={() => setShowMenu(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 py-1 shadow-xl">
            {menuItems.map((it) => (
              <button
                key={it.label}
                type="button"
                disabled={it.disabled}
                onClick={() => { setShowMenu(false); it.onClick(); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40',
                  it.danger ? 'text-red-300 hover:bg-red-500/15' : 'text-ink-200 hover:bg-ink-800',
                )}
              >
                <span className="relative shrink-0">
                  {it.icon}
                  {it.dot && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </span>
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /**
   * Cầm dọc toàn màn hình thì dựng nguyên **thân máy candybar** chứ không chia
   * đôi tuỳ ý: tỉ lệ lấy theo mặt trước Nokia 6300 thật (cao 106.4 mm) —
   * dải trên (loa thoại + nhãn) ~17 mm, kính màn hình ~41 mm, cụm phím
   * điều hướng + bàn phím số ~45 mm. Quy ra flex là 39 : 43 cho màn hình và
   * bàn phím, dải trên cao tự nhiên theo nội dung.
   */
  const chassisTop = (earpiece: boolean) => (
    <div className="shrink-0 px-1 pb-1">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold">{gameTitle}</p>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
          <span className={cn('flex items-center gap-1 rounded-full px-1.5 py-0.5 ring-1 ring-white/10',
            session && remaining < 120 ? 'bg-red-500/25 text-red-300' : 'bg-black/45 text-ink-200')}>
            <Timer size={11} /> {session ? fmtClock(remaining) : '--:--'}
          </span>
          {menu}
        </div>
      </div>
      {/* Loa thoại: khe hẹp giữa thân máy, ngay trên kính màn hình */}
      {earpiece && (
        <div className="mx-auto mt-1.5 h-[3px] w-16 rounded-full bg-ink-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]" />
      )}
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
        {menu}
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
      {!fill && topBar}

      {fill && wide ? (
        /**
         * Cầm ngang: vẫn là thân máy, chỉ xoay thành dáng máy chơi game cầm tay
         * — vòng xoay bên trái, kính ở giữa, bàn phím số bên phải, hàng phím
         * chức năng chạy dưới đáy khoang màn hình.
         */
        <div className={cn(
          'flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.6)]',
          skin.edge, skin.keypad,
        )}>
          <div className="flex shrink-0 items-center px-2.5">{keypad.dpad}</div>

          {/* Khoang màn hình: tối hơn thân máy, kính ôm sát khung game */}
          <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-1.5 pt-1', skin.top)}>
            {chassisTop(false)}
            <div ref={areaRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
              <div
                ref={bezelRef}
                className="rounded-lg border border-black/80 bg-ink-950 p-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]"
              >
                {screenBox}
              </div>
            </div>
            <div className="mt-1.5 shrink-0">{keypad.functionRow}</div>
          </div>

          <div className="flex shrink-0 items-center px-2.5">{keypad.numpad}</div>
        </div>
      ) : portraitChassis ? (
        /**
         * Cầm dọc: nguyên **thân máy** bọc cả màn hình lẫn bàn phím, kiểu skin
         * của các emulator máy cổ. Thân hai tông như máy thật — nửa trên tối
         * ôm lấy kính, nửa dưới sáng màu là mặt phím. Tỉ lệ 56 : 44 lấy theo
         * skin candybar thật (mặt trước chia màn hình ~57%, bàn phím ~40%).
         */
        <div className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.6)]',
          skin.edge,
        )}>
          {/* Nửa trên: mặt trước tối, dải trên + kính màn hình */}
          <div className={cn('flex min-h-0 flex-col px-1.5 pb-1.5 pt-1', split.top, skin.top)}>
            {chassisTop(true)}
            {/*
              Kính màn hình lấp **trọn vùng phía trên bàn phím** — hết bề ngang
              lẫn hết chiều cao còn lại, không chốt tỉ lệ. Khung game bên trong
              vẫn giữ đúng tỉ lệ máy ảo; phần thừa là nền kính đen nên không
              nhìn ra dải viền, y như màn hình máy thật.

              Đừng gán `aspect-ratio` cho kính: máy 240×320 ở full bề ngang sẽ
              cao 513px, nuốt hết chỗ của bàn phím.
            */}
            <div
              ref={bezelRef}
              className="min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-black/80 bg-ink-950 p-1 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]"
            >
              <div ref={areaRef} className="flex h-full w-full items-center justify-center">
                {screenBox}
              </div>
            </div>
          </div>

          {saveNote && (
            <p className="shrink-0 bg-ink-950 py-1 text-center text-xs text-brand-300">{saveNote}</p>
          )}

          {/*
            Nửa dưới: mặt phím sáng màu, tách hẳn khối với nửa trên.

            `h-[19.5rem]` là chiều cao vừa đủ cho phím mềm + cụm mũi tên + bốn
            hàng phím số ở cỡ bấm được (~30px/hàng). Trên máy màn hình ngắn nó
            co lại theo `max-h` chứ không đẩy kính ra ngoài thân máy — nhưng
            `56%` là mức thấp nhất còn bấm được: để `46%` thì màn hình 320×568
            bóp hàng phím số xuống 22px.
          */}
          <div className={cn('h-[19.5rem] max-h-[56%] min-h-[16.5rem] border-t border-black/60 px-2.5 pb-2 pt-1.5', split.bottom, skin.keypad)}>
            {keypad.phonePad}
          </div>
        </div>
      ) : (
        <>
          <div ref={areaRef} className="flex h-[60vh] items-center justify-center">
            {screenBox}
          </div>
          {saveNote && <p className="mt-1.5 shrink-0 text-center text-xs text-brand-300">{saveNote}</p>}
          <div className="mt-2 w-full shrink-0 sm:mt-4">{keypad.phonePad}</div>
        </>
      )}

      {/* Chọn máy ảo — đè lên trên khi toàn màn hình */}
      {showDevices && (
        <div className={cn('rounded-xl bg-ink-900 p-4',
          fill ? 'absolute inset-x-2 bottom-2 top-14 shadow-xl' : 'mt-4 max-h-96')}>
          <DevicePicker
            devices={devices}
            currentId={profile?.id}
            playHref={(id) => `/games/${slug}/play?${new URLSearchParams({
              ...(versionId ? { version: versionId } : {}),
              profile: id,
              ...(fill ? {} : { force: '1' }),
            }).toString()}`}
            onClose={() => setShowDevices(false)}
          />
        </div>
      )}

      {/* Cấu hình riêng cho game — kích thước, cách phóng, tốc độ… */}
      {showConfig && (
        <div className={cn('rounded-xl bg-ink-900 p-4',
          fill ? 'absolute inset-x-2 bottom-2 top-14 shadow-xl' : 'mt-4 max-h-[32rem]')}>
          <EmulatorSettings
            config={config}
            device={{
              name: profile?.name ?? 'Máy ảo',
              width: profile?.screenWidth ?? 240,
              height: profile?.screenHeight ?? 320,
            }}
            onChange={updateConfig}
            onClose={() => setShowConfig(false)}
            saving={savingConfig}
            loggedIn={loggedIn}
            profileId={profile?.id}
            keymap={keymap}
            onKeymapChange={setKeymap}
          />
        </div>
      )}

    </div>
  );
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Chấm nhỏ báo mục này đang khác mặc định. */
  dot?: boolean;
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
