'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

// 20 nhóm Seller Center. href != null = đã có trang; null = sắp có.
const SECTIONS: { label: string; href: string | null }[] = [
  { label: '1. Dashboard', href: '/seller' },
  { label: '2. Sản phẩm', href: '/store/manage' },
  { label: '3. Kho hàng', href: '/seller/stock' },
  { label: '4. Đơn hàng', href: '/seller/orders' },
  { label: '5. Chat khách hàng', href: '/chat' },
  { label: '6. Hỗ trợ / Ticket', href: '/store/manage' },
  { label: '7. Ví & Tài chính', href: '/seller/wallet' },
  { label: '8. Rút tiền', href: '/seller/withdraw' },
  { label: '9. Mã giảm giá', href: '/store/manage' },
  { label: '11. Đánh giá', href: '/seller/reviews' },
  { label: '14. Hồ sơ gian hàng', href: '/store/manage' },
  { label: '17. Xếp hạng Seller', href: '/seller' },
  { label: '16. Thông báo', href: '/notifications' },
  { label: '18. Công cụ AI', href: '/seller/ai' },
  { label: '10. Quảng bá (gem)', href: '/seller/boost' },
  { label: '12. Thống kê', href: '/seller/analytics' },
  { label: '13. Nhân viên', href: '/seller/staff' },
  { label: '20. Nhật ký', href: '/seller/activity' },
  { label: '15. Bảo mật', href: '/seller/security' },
  { label: '19. Nâng cao', href: null },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<any>('/marketplace/me/storefront').then((s) => setHasStore(!!s)).catch(() => setHasStore(false));
  }, [user]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Đăng nhập để vào Seller Center.</div>;
  if (hasStore === null) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  // Chưa có gian hàng -> không hiện phần quản lý, mời mở gian hàng
  if (!hasStore) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="text-4xl">🏪</div>
        <h1 className="mt-3 text-lg font-bold">Bạn chưa có gian hàng</h1>
        <p className="mt-1 text-sm text-ink-500">Mở gian hàng để bắt đầu bán sản phẩm và dùng các công cụ quản lý của Seller Center.</p>
        <Link href="/store/manage" className="btn-primary mt-4 inline-block">Mở gian hàng ngay</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="card h-fit p-2">
        <div className="px-3 py-2 text-sm font-bold text-brand-600">SELLER CENTER</div>
        <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto">
          {SECTIONS.map((s) =>
            s.href ? (
              <Link key={s.label} href={s.href}
                className={`block rounded-lg px-3 py-2 text-sm ${path === s.href ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
                {s.label}
              </Link>
            ) : (
              <span key={s.label} className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-ink-400" title="Đang phát triển">{s.label} ·</span>
            ),
          )}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
