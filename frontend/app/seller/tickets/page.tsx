'use client';

import { useAuth } from '@/components/AuthProvider';
import { Tickets } from '../shopParts';

export default function SellerTicketsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Hỗ trợ / Ticket</h1>
      {user ? <Tickets ownerId={user.id} /> : <div className="card p-6 text-center text-ink-500">Đăng nhập…</div>}
    </div>
  );
}
