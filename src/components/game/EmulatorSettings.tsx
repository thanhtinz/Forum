'use client';

import { useState } from 'react';
import { Check, Gauge, Keyboard, Loader2, Monitor, RotateCcw, Sliders, Volume2, X } from 'lucide-react';
import {
  DEFAULT_CONFIG, FILTER_LABEL, FONT_SIZE_LABEL, FPS_STEPS, SCALING_LABEL,
  SCREEN_PRESETS, SPEED_STEPS, type EmulatorConfig,
} from '@/lib/emulator-config';
import { cn } from '@/lib/utils';
import { KeymapEditor } from './KeymapEditor';
import type { EmuKey } from '@/lib/emulator-keys';

export interface EmulatorSettingsProps {
  config: EmulatorConfig;
  /** Kích thước gốc của máy ảo đang chọn — dùng làm mục “theo máy”. */
  device: { name: string; width: number; height: number };
  onChange: (next: EmulatorConfig) => void;
  onClose: () => void;
  /** Đang lưu lên tài khoản. */
  saving?: boolean;
  /** Đã đăng nhập thì cấu hình lưu theo tài khoản, không thì theo trình duyệt. */
  loggedIn: boolean;
  /** Gán phím bàn phím PC — cũng là một phần cấu hình của game. */
  profileId?: string;
  keymap: Record<string, EmuKey>;
  onKeymapChange: (next: Record<string, EmuKey>) => void;
}

/**
 * Bảng cấu hình emulator cho riêng một game — tương đương phần “cấu hình” của
 * J2ME Loader, nhưng không có bước import: mở game nào là cấu hình của game đó.
 */
export function EmulatorSettings({
  config, device, onChange, onClose, saving, loggedIn, profileId, keymap, onKeymapChange,
}: EmulatorSettingsProps) {
  const [custom, setCustom] = useState({
    w: String(config.screenWidth ?? ''),
    h: String(config.screenHeight ?? ''),
  });

  const set = <K extends keyof EmulatorConfig>(key: K, value: EmulatorConfig[K]) =>
    onChange({ ...config, [key]: value });

  const useDeviceScreen = config.screenWidth === null;

  const applyCustom = () => {
    const w = Number(custom.w);
    const h = Number(custom.h);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      onChange({ ...config, screenWidth: w, screenHeight: h });
    }
  };

  return (
    <div className="flex h-full flex-col text-sm">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <p className="flex items-center gap-1.5 font-bold">
          <Sliders size={15} /> Cấu hình game
          {saving && <Loader2 size={13} className="animate-spin text-brand-400" />}
        </p>
        <button type="button" onClick={onClose} aria-label="Đóng" className="text-ink-400 hover:text-ink-100">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {/* ── Màn hình ── */}
        <Section icon={<Monitor size={13} />} title="Kích thước màn hình">
          <div className="flex flex-wrap gap-1.5">
            <Chip active={useDeviceScreen} onClick={() => onChange({ ...config, screenWidth: null, screenHeight: null })}>
              Theo máy ({device.width}×{device.height})
            </Chip>
            {SCREEN_PRESETS.map((p) => (
              <Chip
                key={`${p.w}x${p.h}`}
                active={config.screenWidth === p.w && config.screenHeight === p.h}
                onClick={() => onChange({ ...config, screenWidth: p.w, screenHeight: p.h })}
                title={p.note}
              >
                {p.w}×{p.h}
              </Chip>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <input
              inputMode="numeric" placeholder="rộng" value={custom.w}
              onChange={(e) => setCustom((c) => ({ ...c, w: e.target.value }))}
              className="w-20 rounded-lg bg-ink-800 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-500"
              aria-label="Chiều rộng tuỳ chọn"
            />
            <span className="text-ink-500">×</span>
            <input
              inputMode="numeric" placeholder="cao" value={custom.h}
              onChange={(e) => setCustom((c) => ({ ...c, h: e.target.value }))}
              className="w-20 rounded-lg bg-ink-800 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-500"
              aria-label="Chiều cao tuỳ chọn"
            />
            <button type="button" onClick={applyCustom} className="btn-primary !px-3 !py-1.5 text-xs">
              <Check size={13} /> Áp dụng
            </button>
          </div>
        </Section>

        <Section title="Cách phóng">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SCALING_LABEL) as (keyof typeof SCALING_LABEL)[]).map((k) => (
              <Chip key={k} active={config.scaling === k} onClick={() => set('scaling', k)}>
                {SCALING_LABEL[k]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Lọc ảnh">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABEL) as (keyof typeof FILTER_LABEL)[]).map((k) => (
              <Chip key={k} active={config.filter === k} onClick={() => set('filter', k)}>
                {FILTER_LABEL[k]}
              </Chip>
            ))}
          </div>
        </Section>

        {/* ── Tốc độ ── */}
        <Section icon={<Gauge size={13} />} title="Tốc độ chạy">
          <div className="flex flex-wrap gap-1.5">
            {SPEED_STEPS.map((v) => (
              <Chip key={v} active={config.speed === v} onClick={() => set('speed', v)}>
                {v}×
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-400">
            Game Java thường chạy chậm — kéo lên 1.5× hoặc 2× cho mượt. Nhanh quá thì game khó theo kịp.
          </p>
        </Section>

        <Section title="Giới hạn khung hình">
          <div className="flex flex-wrap gap-1.5">
            {FPS_STEPS.map((v) => (
              <Chip key={v} active={config.fps === v} onClick={() => set('fps', v)}>
                {v === 0 ? 'Không giới hạn' : `${v} FPS`}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Cỡ chữ trong game">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FONT_SIZE_LABEL) as (keyof typeof FONT_SIZE_LABEL)[]).map((k) => (
              <Chip key={k} active={config.fontSize === k} onClick={() => set('fontSize', k)}>
                {FONT_SIZE_LABEL[k]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section icon={<Volume2 size={13} />} title="Khác">
          <div className="flex flex-wrap gap-1.5">
            <Chip active={config.sound} onClick={() => set('sound', !config.sound)}>
              Âm thanh {config.sound ? 'bật' : 'tắt'}
            </Chip>
            <Chip active={config.vibrate} onClick={() => set('vibrate', !config.vibrate)}>
              Rung phím {config.vibrate ? 'bật' : 'tắt'}
            </Chip>
          </div>
        </Section>

        {profileId && (
          <Section icon={<Keyboard size={13} />} title="Gán phím bàn phím">
            <KeymapEditor
              profileId={profileId}
              keymap={keymap}
              onChange={onKeymapChange}
              canPersist={loggedIn}
            />
          </Section>
        )}
      </div>

      <div className="mt-3 shrink-0 space-y-1.5">
        <button
          type="button"
          onClick={() => { onChange({ ...DEFAULT_CONFIG }); setCustom({ w: '', h: '' }); }}
          className="btn-outline w-full !py-1.5 text-xs !text-ink-200"
        >
          <RotateCcw size={13} /> Về mặc định
        </button>
        <p className="text-center text-[11px] text-ink-400">
          {loggedIn
            ? 'Cấu hình lưu theo tài khoản, mở game này ở máy khác vẫn giữ nguyên.'
            : 'Cấu hình lưu trong trình duyệt này. Đăng nhập để đồng bộ theo tài khoản.'}
        </p>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
        {icon}{title}
      </p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, title }: {
  active: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      className={cn(
        'chip border transition-colors',
        active ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-700 text-ink-300 hover:border-brand-400',
      )}
    >
      {children}
    </button>
  );
}
