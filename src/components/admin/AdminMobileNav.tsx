'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ShieldAlert } from 'lucide-react';
import { AdminNavItems } from './AdminNavItems';

/** Nút burger + drawer điều hướng quản trị cho mobile. */
export function AdminMobileNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Khoá cuộn nền khi mở drawer
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <>
      <button type="button" aria-label="Mở menu quản trị" onClick={() => setOpen(true)}
        className="grid size-9 place-items-center rounded-lg text-ink-200 hover:bg-ink-800 lg:hidden">
        <Menu size={20} />
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col bg-white shadow-xl dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <span className="flex items-center gap-1.5 text-sm font-bold text-brand-600"><ShieldAlert size={16} /> Quản trị</span>
              <button type="button" aria-label="Đóng" onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <AdminNavItems onNavigate={() => setOpen(false)} isSuperAdmin={isSuperAdmin} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
