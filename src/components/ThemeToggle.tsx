'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { THEME_STORAGE_KEY as STORAGE_KEY } from '@/lib/theme';

export type Theme = 'light' | 'dark';

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

/** Nút chuyển sáng/tối, ghi nhớ trong localStorage. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = (() => {
      try { return localStorage.getItem(STORAGE_KEY) as Theme | null; } catch { return null; }
    })();
    const initial: Theme = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    apply(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    apply(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* chế độ riêng tư */ }
  };

  return (
    <button type="button" onClick={toggle}
      aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
      className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
      {/* Trước khi biết theme thì vẽ mặt trăng để không nhấp nháy đổi biểu tượng */}
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
