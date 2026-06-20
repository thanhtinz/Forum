'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, Package, Boxes, BadgePercent, ShoppingCart, Wallet,
  Banknote, MessagesSquare, Star, BarChart3, Megaphone, Bot, Users, Menu, X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface Item { label: string; href: string; icon: any }
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Gian hàng',
    items: [
      { label: 'Tổng quan', href: '/seller', icon: LayoutDashboard },
      { label: 'Hồ sơ gian hàng', href: '/seller/shop', icon: Store },
      { label: 'Sản phẩm', href: '/seller/products', icon: Package },
      { label: 'Kho hàng', href: '/seller/stock', icon: Boxes },
      { label: 'Mã giảm giá', href: '/seller/coupons', icon: BadgePercent },
      { label: 'Đơn hàng', href: '/seller/orders', icon: ShoppingCart },
      { label: 'Đơn & Thu nhập', href: '/seller/earnings', icon: Wallet },
      { label: 'Hỗ trợ / Ticket', href: '/seller/tickets', icon: MessagesSquare },
    ],
  },
  {
    title: 'Tài chính',
    items: [
      { label: 'Ví & Tài chính', href: '/seller/wallet', icon: Wallet },
      { label: 'Rút tiền', href: '/seller/withdraw', icon: Banknote },
    ],
  },
  {
    title: 'Phát triển',
    items: [
      { label: 'Đánh giá', href: '/seller/reviews', icon: Star },
      { label: 'Thống kê', href: '/seller/analytics', icon: BarChart3 },
      { label: 'Quảng bá (gem)', href: '/seller/boost', icon: Megaphone },
      { label: 'Công cụ AI', href: '/seller/ai', icon: Bot },
      { label: 'Nhân viên', href: '/seller/staff', icon: Users },
    ],
  },
];

function NavList({ onNavigate, aiActive }: { onNavigate?: () => void; aiActive?: boolean }) {
  const path = usePathname();
  const isActive = (href: string) => path === href;
  return (
    <nav className="space-y-3">
      {GROUPS.map((g) => {
        const items = g.items.filter((s) => s.href !== '/seller/ai' || aiActive);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{g.title}</div>
            <div className="space-y-0.5">
              {items.map((s) => (
                <Link key={s.label} href={s.href} onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive(s.href) ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
                  <s.icon size={16} className="shrink-0" /> {s.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [aiActive, setAiActive] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<any>('/marketplace/me/storefront').then((s) => {
      setHasStore(!!s);
      setAiActive(!!s && (s.aiForever || (s.aiUntil && new Date(s.aiUntil).getTime() > Date.now())));
    }).catch(() => setHasStore(false));
  }, [user]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Đăng nhập để vào Seller Center.</div>;
  if (hasStore === null) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  // Chưa có gian hàng: cho phép vào trang tạo gian hàng (/seller/shop), còn lại mời mở gian hàng
  if (!hasStore && path !== '/seller/shop') {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="text-4xl">🏪</div>
        <h1 className="mt-3 text-lg font-bold">Bạn chưa có gian hàng</h1>
        <p className="mt-1 text-sm text-ink-500">Mở gian hàng để bắt đầu bán sản phẩm và dùng các công cụ quản lý của Seller Center.</p>
        <Link href="/seller/shop" className="btn-primary mt-4 inline-block">Mở gian hàng ngay</Link>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-5">
      {/* Sidebar cố định (desktop) */}
      <aside className="hidden h-fit lg:block">
        <div className="card p-2">
          <div className="px-3 py-2 text-sm font-bold text-brand-600">SELLER CENTER</div>
          <div className="max-h-[80vh] overflow-y-auto">
            <NavList aiActive={aiActive} />
          </div>
        </div>
      </aside>

      {/* Nút mở menu (mobile) */}
      <div className="mb-3 lg:hidden">
        <button onClick={() => setDrawer(true)} className="btn-outline inline-flex items-center gap-2 text-sm">
          <Menu size={16} /> Menu Seller Center
        </button>
      </div>

      {/* Drawer trượt từ trái (mobile) */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawer(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] overflow-y-auto bg-white p-2 shadow-xl dark:bg-ink-900 lg:hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-bold text-brand-600">SELLER CENTER</span>
              <button onClick={() => setDrawer(false)} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={18} /></button>
            </div>
            <NavList aiActive={aiActive} onNavigate={() => setDrawer(false)} />
          </div>
        </>
      )}

      <div>{children}</div>
    </div>
  );
}
