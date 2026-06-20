'use client';

import { Coupons } from '../shopParts';

export default function SellerCouponsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mã giảm giá</h1>
      <Coupons />
    </div>
  );
}
