'use client';

import { xoaDanhGia } from '@/app/(quan-tri)/quan-tri/viec';
import { NutViec } from './NutViec';

/** Xoá một bài đánh giá rác. Điểm trung bình của game tính lại ở máy chủ. */
export function NutXoaDanhGia({ danhGiaId, tenGame, nguoi }: {
  danhGiaId: string;
  tenGame: string;
  nguoi: string;
}) {
  return (
    <NutViec
      lam={() => xoaDanhGia(danhGiaId)}
      kieu="nguyHiem"
      nhan="Xoá bài này"
      className="!px-0 !py-0"
      xacNhan={`Xoá bài đánh giá của ${nguoi} cho “${tenGame}”? Điểm trung bình của game sẽ tính lại.`} />
  );
}
