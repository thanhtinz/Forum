'use client';

import { useState } from 'react';
import { Music, Gift, CalendarCheck, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { FloatingDock } from './FloatingDock';
import { GiftcodeDock } from './GiftcodeDock';
import { CheckInDock } from './CheckInDock';
import { AdminModBar } from './AdminModBar';

type Key = 'music' | 'gift' | 'checkin' | 'admin';

// Cụm nút nổi gọn: bình thường thu vào sát mép phải (nút mũi tên),
// bấm mũi tên để mở ra hàng nút → chọn chức năng.
export function FloatingDockBar() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Key | null>(null);
  const isStaff = !!user && (user.role === 'ADMIN' || user.role === 'MODERATOR');

  const buttons = ([
    { key: 'music', icon: Music, cls: 'bg-brand-600 hover:bg-brand-700', title: 'Nhạc', show: true },
    { key: 'gift', icon: Gift, cls: 'bg-gradient-to-br from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700', title: 'Giftcode', show: !!user },
    { key: 'checkin', icon: CalendarCheck, cls: 'bg-amber-500 hover:bg-amber-600', title: 'Điểm danh', show: !!user },
    { key: 'admin', icon: ShieldAlert, cls: 'bg-rose-600 hover:bg-rose-700', title: 'Kiểm duyệt', show: isStaff },
  ] as { key: Key; icon: any; cls: string; title: string; show: boolean }[]).filter((b) => b.show);

  function choose(k: Key) { setActive((cur) => (cur === k ? null : k)); setExpanded(false); }
  const close = () => setActive(null);

  return (
    <>
      {/* Các panel (luôn mount FloatingDock để phát nhạc nền) */}
      <FloatingDock open={active === 'music'} onClose={close} />
      {user && <GiftcodeDock open={active === 'gift'} onClose={close} />}
      {user && <CheckInDock open={active === 'checkin'} onClose={close} />}
      {isStaff && <AdminModBar open={active === 'admin'} onClose={close} />}

      {/* Cụm nút ở mép phải */}
      {!expanded ? (
        <button onClick={() => setExpanded(true)} title="Mở công cụ"
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 grid h-12 w-7 place-items-center rounded-l-xl bg-brand-600 text-white shadow-lg hover:bg-brand-700">
          <ChevronLeft size={18} />
        </button>
      ) : (
        <div className="fixed right-2 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-ink-200/70 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-ink-700 dark:bg-ink-900/95">
          <button onClick={() => setExpanded(false)} title="Thu gọn" className="grid h-7 w-7 place-items-center rounded-full text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
            <ChevronRight size={16} />
          </button>
          {buttons.map((b) => (
            <button key={b.key} onClick={() => choose(b.key)} title={b.title}
              className={`grid h-11 w-11 place-items-center rounded-full text-white shadow-md transition active:scale-95 ${b.cls} ${active === b.key ? 'ring-2 ring-offset-2 ring-ink-400 dark:ring-offset-ink-900' : ''}`}>
              <b.icon size={20} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
