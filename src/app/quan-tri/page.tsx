import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { gonSo } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quản trị' };

export default async function TongQuan() {
  const [dangHien, nhap, nguoiDung, danhGia, chuDe, yeuCauCho, tongTai] = await Promise.all([
    db.game.count({ where: { trangThai: 'DANG_HIEN' } }),
    db.game.count({ where: { trangThai: 'NHAP' } }),
    db.nguoiDung.count(),
    db.danhGia.count(),
    db.chuDe.count(),
    db.yeuCau.count({ where: { trangThai: 'CHO_XEM' } }),
    db.game.aggregate({ _sum: { soLuotTai: true } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[26px] font-bold tracking-tight">Tổng quan</h1>
        <Link href="/quan-tri/game/moi" className="nut-cai-dam !min-h-[38px] !px-4 !text-[13px]">
          <Plus size={15} /> Thêm game
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <O nhan="Game đang hiện" so={gonSo(dangHien)} />
        <O nhan="Game nháp" so={gonSo(nhap)} nhanManh={nhap > 0} />
        <O nhan="Tổng lượt tải" so={gonSo(tongTai._sum.soLuotTai ?? 0)} />
        <O nhan="Thành viên" so={gonSo(nguoiDung)} />
        <O nhan="Đánh giá" so={gonSo(danhGia)} />
        <O nhan="Chủ đề" so={gonSo(chuDe)} />
        <O nhan="Yêu cầu chờ xem" so={gonSo(yeuCauCho)} nhanManh={yeuCauCho > 0} />
      </div>
    </div>
  );
}

function O({ nhan, so, nhanManh }: { nhan: string; so: string; nhanManh?: boolean }) {
  return (
    <div className="the p-4">
      <p className="phu">{nhan}</p>
      <p className={`mt-1 text-[24px] font-bold leading-none ${nhanManh ? 'text-nhan' : ''}`}>{so}</p>
    </div>
  );
}
