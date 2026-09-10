import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, Inbox, Library, LogIn, LogOut, MessageSquare, Shield, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { dangXuat } from '../dang-nhap/viec';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tài khoản' };

/*
 * TRANG TÀI KHOẢN.
 *
 * Khách chưa đăng nhập vẫn vào được, và thấy lời mời đăng nhập chứ không bị
 * đá sang trang khác: mục "Tôi" nằm ở thanh tab đáy, bấm vào mà bị văng đi
 * chỗ khác thì lần sau người ta không dám bấm nữa.
 */
export default async function TrangToi() {
  const nguoi = await nguoiHienTai();

  if (!nguoi) {
    return (
      <div className="the mx-auto max-w-sm p-8 text-center">
        <LogIn size={24} className="mx-auto text-mo" />
        <h1 className="mt-2 text-[16px] font-bold">Bạn chưa đăng nhập</h1>
        <p className="phu mt-1">
          Tải game thì không cần tài khoản. Có tài khoản thì thêm được thư viện,
          đánh giá và thảo luận.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/dang-nhap" className="nut-cai-dam !min-h-[38px] !px-5 !text-[13px]">Đăng nhập</Link>
          <Link href="/dang-ky" className="nut-vien">Đăng ký</Link>
        </div>
      </div>
    );
  }

  const [soTai, soDanhGia, soChuDe] = await Promise.all([
    db.luotTai.count({ where: { nguoiId: nguoi.id } }),
    db.danhGia.count({ where: { nguoiId: nguoi.id } }),
    db.chuDe.count({ where: { nguoiId: nguoi.id } }),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-4">
        {nguoi.anh ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nguoi.anh} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-nhan/15 text-[24px] font-bold text-nhan">
            {nguoi.tenHienThi.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold">{nguoi.tenHienThi}</h1>
          <p className="phu">@{nguoi.tenDangNhap}</p>
        </div>
      </div>

      <div className="the grid grid-cols-3 divide-x divide-vien text-center">
        <O so={soTai} nhan="game đã tải" />
        <O so={soDanhGia} nhan="đánh giá" />
        <O so={soChuDe} nhan="chủ đề" />
      </div>

      <ul className="the divide-y divide-vien">
        <Muc duongDan="/thu-vien" icon={<Library size={18} />} ten="Thư viện của tôi" />
        <Muc duongDan="/yeu-cau" icon={<Inbox size={18} />} ten="Yêu cầu game của tôi" />
        {nguoi.vaiTro === 'QUAN_TRI' && (
          <Muc duongDan="/quan-tri" icon={<Shield size={18} />} ten="Trang quản trị" />
        )}
      </ul>

      <form action={dangXuat}>
        <button type="submit" className="nut-vien w-full !text-xau">
          <LogOut size={16} /> Đăng xuất
        </button>
      </form>
    </div>
  );
}

function O({ so, nhan }: { so: number; nhan: string }) {
  return (
    <div className="px-2 py-3">
      <p className="text-[20px] font-bold leading-none">{so}</p>
      <p className="phu mt-1">{nhan}</p>
    </div>
  );
}

function Muc({ duongDan, icon, ten }: { duongDan: string; icon: React.ReactNode; ten: string }) {
  return (
    <li>
      <Link href={duongDan} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-nen3">
        <span className="shrink-0 text-mo">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{ten}</span>
        <ChevronRight size={16} className="shrink-0 text-mo" />
      </Link>
    </li>
  );
}
