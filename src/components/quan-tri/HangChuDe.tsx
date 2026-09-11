'use client';

import { Lock, LockOpen, Pin, PinOff, Trash2 } from 'lucide-react';
import { ghimChuDe, khoaChuDe, xoaChuDe } from '@/app/(quan-tri)/quan-tri/viec';
import { NutViec } from './NutViec';

export interface ChuDeQuanTri {
  id: string;
  tieuDe: string;
  ghim: boolean;
  khoa: boolean;
  soTraLoi: number;
  taoLuc: string;
  tenNguoi: string;
  tenGame: string;
  duongDanGame: string;
}

/** Ba nút kiểm duyệt của một chủ đề: ghim, khoá, xoá. */
export function NutChuDe({ c }: { c: ChuDeQuanTri }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <NutViec
        lam={() => ghimChuDe(c.id, !c.ghim)}
        nho={c.ghim ? `Bỏ ghim ${c.tieuDe}` : `Ghim ${c.tieuDe}`}
        nhan={c.ghim ? <PinOff size={15} /> : <Pin size={15} />}
        className={c.ghim ? 'text-nhan' : undefined} />
      <NutViec
        lam={() => khoaChuDe(c.id, !c.khoa)}
        nho={c.khoa ? `Mở khoá ${c.tieuDe}` : `Khoá ${c.tieuDe}`}
        nhan={c.khoa ? <LockOpen size={15} /> : <Lock size={15} />}
        className={c.khoa ? 'text-canh' : undefined} />
      <NutViec
        lam={() => xoaChuDe(c.id)}
        kieu="nguyHiem"
        nho={`Xoá chủ đề ${c.tieuDe}`}
        nhan={<Trash2 size={15} />}
        xacNhan={`Xoá hẳn chủ đề “${c.tieuDe}” cùng ${c.soTraLoi} lời đáp trong đó? Không lùi lại được.`} />
    </div>
  );
}
