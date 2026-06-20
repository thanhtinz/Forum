'use client';

import { Products } from '../shopParts';

export default function SellerProductsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Sản phẩm</h1>
      <Products />
    </div>
  );
}
