'use client';

import { Trash2, X } from 'lucide-react';
import { boQuaBaoXau, xoaNoiDungBiBao } from '@/app/(quan-tri)/quan-tri/viec';
import { NutViec } from './NutViec';

/** Hai lối xử lý một lượt báo: xoá nội dung, hoặc đóng lại mà giữ nguyên. */
export function NutBaoXauQuanTri({ baoXauId, loai, mucId, moTa }: {
  baoXauId: string;
  loai: 'danhGia' | 'chuDe' | 'traLoi';
  mucId: string;
  moTa: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <NutViec lam={() => boQuaBaoXau(baoXauId)} nhan={<><X size={14} /> Bỏ qua</>} />
      <NutViec
        lam={() => xoaNoiDungBiBao(loai, mucId)}
        kieu="nguyHiem"
        nhan={<><Trash2 size={14} /> Xoá nội dung</>}
        xacNhan={`Xoá hẳn ${moTa}? Mọi lượt báo về nó cũng mất theo.`} />
    </div>
  );
}
