'use client';

import { ReactNode } from 'react';

// ── Bộ UI dùng chung cho khu quản trị: nhất quán, gọn, dễ nhìn ──

export function PageHeader({ title, desc, icon, actions }: { title: string; desc?: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">{icon}</span>}
        <div>
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          {desc && <p className="text-sm text-ink-500">{desc}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`rounded-2xl border border-ink-200/70 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900 ${pad ? 'p-5' : ''} ${className}`}>{children}</div>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-semibold">{children}</h2>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

type BtnProps = {
  children: ReactNode; onClick?: () => void; type?: 'button' | 'submit';
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'; size?: 'sm' | 'md';
  disabled?: boolean; className?: string; title?: string;
};
export function Btn({ children, onClick, type = 'button', variant = 'primary', size = 'md', disabled, className = '', title }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:pointer-events-none';
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm' }[size];
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    outline: 'border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800',
    ghost: 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
    danger: 'border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30',
  }[variant];
  return <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${base} ${sizes} ${variants} ${className}`}>{children}</button>;
}

export function Field({ label, hint, children, className = '' }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      {label && <span className="mb-1 block font-medium text-ink-700 dark:text-ink-200">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'success' | 'error'; children: ReactNode }) {
  if (!children) return null;
  const styles = {
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    error: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  }[kind];
  return <div className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Empty({ icon, title, desc }: { icon?: ReactNode; title: string; desc?: string }) {
  return (
    <div className="grid place-items-center gap-1 py-10 text-center">
      {icon && <span className="text-ink-300">{icon}</span>}
      <p className="font-medium text-ink-500">{title}</p>
      {desc && <p className="text-sm text-ink-400">{desc}</p>}
    </div>
  );
}

export function StatCard({ label, value, icon, accent = 'brand' }: { label: string; value: ReactNode; icon?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-400">{label}</span>
        {icon && <span className={`text-${accent}-500`}>{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm ${label ? '' : ''}`}>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-700'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
      {label && <span className="text-ink-700 dark:text-ink-200">{label}</span>}
    </button>
  );
}
