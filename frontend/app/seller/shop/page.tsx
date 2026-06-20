'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { StoreInfo } from '../shopParts';

export default function SellerShopPage() {
  const { user, loading } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    api.get<any>('/marketplace/me/storefront').then((s) => { setStore(s); setHasStore(!!s); }).catch(() => setHasStore(false));
  }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để quản lý gian hàng.</div>;
  if (hasStore === null) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Store /> Hồ sơ gian hàng</h1>
        {store && <Link href={`/store?slug=${store.slug}`} className="btn-outline text-xs">Xem gian hàng →</Link>}
      </div>
      <StoreInfo store={store} onSaved={(s) => { setStore(s); setHasStore(true); }} />
    </div>
  );
}
