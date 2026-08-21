'use client';

import { useActionState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { upsertProfile, type ActionState } from '@/app/(site)/admin/emulator/actions';

export interface ProfileFormValues {
  id?: string;
  slug: string; name: string; vendor: string | null;
  screenWidth: number; screenHeight: number; orientation: string;
  cldc: string; midp: string; keyLayout: string;
  softKeys: boolean; audio: boolean; rms: boolean; saveState: boolean; touch: boolean;
  keymap: unknown;
  cpuMillicores: number; ramLimitMb: number;
  sessionMaxSec: number; idleTimeoutSec: number; gracePeriodSec: number; maxConcurrent: number;
  runtimeUrl: string | null; active: boolean;
}

export const EMPTY_PROFILE: ProfileFormValues = {
  slug: '', name: '', vendor: null,
  screenWidth: 240, screenHeight: 320, orientation: 'PORTRAIT',
  cldc: '1.1', midp: '2.0', keyLayout: 'nokia',
  softKeys: true, audio: true, rms: true, saveState: false, touch: true,
  keymap: null,
  cpuMillicores: 500, ramLimitMb: 256,
  sessionMaxSec: 1800, idleTimeoutSec: 120, gracePeriodSec: 60, maxConcurrent: 50,
  runtimeUrl: null, active: true,
};

/** Form tạo/sửa emulator profile: màn hình, capability, keymap và hạn mức tài nguyên. */
export function ProfileForm({ value }: { value: ProfileFormValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertProfile, {});

  return (
    <form action={action} className="space-y-4">
      {value.id && <input type="hidden" name="id" value={value.id} />}

      <Group title="Định danh">
        <Text name="name" label="Tên profile *" defaultValue={value.name} required placeholder="Nokia S40 240x320" />
        <Text name="slug" label="Slug" defaultValue={value.slug} placeholder="nokia-s40-240x320" />
        <Text name="vendor" label="Nhà sản xuất" defaultValue={value.vendor ?? ''} placeholder="Nokia" />
      </Group>

      <Group title="Màn hình">
        <Num name="screenWidth" label="Rộng (px)" defaultValue={value.screenWidth} />
        <Num name="screenHeight" label="Cao (px)" defaultValue={value.screenHeight} />
        <Sel name="orientation" label="Hướng" defaultValue={value.orientation}
          options={[['PORTRAIT', 'Dọc'], ['LANDSCAPE', 'Ngang']]} />
      </Group>

      <Group title="Capability">
        <Text name="cldc" label="CLDC" defaultValue={value.cldc} />
        <Text name="midp" label="MIDP" defaultValue={value.midp} />
        <Sel name="keyLayout" label="Bố cục phím" defaultValue={value.keyLayout}
          options={[['nokia', 'Nokia'], ['sonyericsson', 'Sony Ericsson'], ['samsung', 'Samsung'], ['generic', 'Generic']]} />
      </Group>

      <div className="flex flex-wrap gap-5">
        <Toggle name="softKeys" label="Soft keys" defaultChecked={value.softKeys} />
        <Toggle name="audio" label="Audio" defaultChecked={value.audio} />
        <Toggle name="rms" label="RMS" defaultChecked={value.rms} />
        <Toggle name="saveState" label="Save state" defaultChecked={value.saveState} />
        <Toggle name="touch" label="Touch-to-key" defaultChecked={value.touch} />
        <Toggle name="active" label="Đang bật" defaultChecked={value.active} />
      </div>

      <Group title="Hạn mức tài nguyên">
        <Num name="cpuMillicores" label="CPU (millicores)" defaultValue={value.cpuMillicores} />
        <Num name="ramLimitMb" label="RAM (MB)" defaultValue={value.ramLimitMb} />
        <Num name="maxConcurrent" label="Phiên đồng thời tối đa" defaultValue={value.maxConcurrent} />
        <Num name="sessionMaxSec" label="Thời lượng phiên tối đa (giây)" defaultValue={value.sessionMaxSec} />
        <Num name="idleTimeoutSec" label="Idle timeout (giây)" defaultValue={value.idleTimeoutSec} />
        <Num name="gracePeriodSec" label="Grace reconnect (giây)" defaultValue={value.gracePeriodSec} />
      </Group>

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Runtime URL (iframe sandbox)</span>
        <input name="runtimeUrl" defaultValue={value.runtimeUrl ?? ''} className="input" placeholder="https://emu.example.com/j2me/" />
        <span className="mt-1 block text-[11px] text-ink-400">
          Bỏ trống nếu chưa gắn runtime — game vẫn tải về được, chỉ Play Online là chưa chạy.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Keymap mặc định (JSON: {'{'}&quot;KeyQ&quot;:&quot;SOFT_LEFT&quot;{'}'})
        </span>
        <textarea name="keymap" rows={3} defaultValue={value.keymap ? JSON.stringify(value.keymap) : ''} className="input font-mono text-xs" />
      </label>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Đã lưu.</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu profile
      </button>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Text({ name, label, ...rest }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink-400">{label}</span>
      <input name={name} className="input !py-2 text-sm" {...rest} />
    </label>
  );
}

function Num({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return <Text name={name} label={label} type="number" defaultValue={defaultValue} />;
}

function Sel({ name, label, defaultValue, options }: {
  name: string; label: string; defaultValue: string; options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink-400">{label}</span>
      <select name={name} defaultValue={defaultValue} className="input !py-2 text-sm">
        {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} /> {label}
    </label>
  );
}
