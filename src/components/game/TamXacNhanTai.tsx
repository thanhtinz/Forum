'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, X } from 'lucide-react';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { gonDungLuong } from '@/lib/tien-ich';

export interface TepChon {
  id: string;
  loai: string;
  dungLuong: number | null;
  soHieu: string;
  heMay: string;
}

/**
 * TẤM XÁC NHẬN TRƯỚC KHI TẢI.
 *
 * App Store không bao giờ cài thẳng khi bấm "Get": nó trượt lên một tấm nhỏ
 * bày lại tên ứng dụng, hãng làm ra nó, và TÀI KHOẢN đang dùng, rồi mới xin
 * một cú xác nhận nữa. Cái nhịp ấy không phải thủ tục thừa — nó là chỗ duy
 * nhất người dùng đọc lại xem mình sắp lấy đúng thứ mình tưởng hay không.
 *
 * Ở một cửa hàng game cũ thì nhịp ấy còn cần hơn: một game có năm bản cho năm
 * hệ máy, và tải nhầm bản JAR về máy Android là mất công tải lại từ đầu trên
 * một đường truyền vốn đã chậm. Tấm này in rõ HỆ MÁY và SỐ HIỆU BẢN — đúng
 * hai thứ hay nhầm nhất — ngay trước khi tệp bắt đầu chảy.
 *
 * Dùng <dialog> thật với `showModal()`: nó mang sẵn bẫy tiêu điểm, đóng bằng
 * Esc và chặn cuộn phía sau. Tự dựng lớp phủ bằng div thì lần nào cũng thiếu
 * một trong ba thứ ấy.
 */
export function TamXacNhanTai({ tep, game, taiKhoan, mo, dong }: {
  tep: TepChon | null;
  game: { ten: string; icon: string | null; nhaPhatTrien: string | null };
  /** Tên người đang đăng nhập, hoặc `null` nếu là khách. */
  taiKhoan: string | null;
  mo: boolean;
  dong: () => void;
}) {
  const router = useRouter();
  const hopRef = useRef<HTMLDialogElement>(null);
  const [dangDi, datDangDi] = useState(false);

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (mo && !hop.open) hop.showModal();
    if (!mo && hop.open) hop.close();
    if (!mo) datDangDi(false);
  }, [mo]);

  if (!tep) return null;

  return (
    <dialog ref={hopRef} onClose={dong}
      className="tam-truot w-full max-w-[440px] text-chu backdrop:bg-black/40">
      <div className="p-4">
        <header className="flex items-center justify-between">
          <h2 className="tieu-de-nho">SunnyStore</h2>
          <button type="button" onClick={dong} aria-label="Đóng" className="nut-tron">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="the mt-3 p-4">
          <div className="flex items-center gap-3">
            <BieuTuongGame ten={game.ten} icon={game.icon} co={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-tight">{game.ten}</p>
              {game.nhaPhatTrien && <p className="phu mt-0.5 truncate">{game.nhaPhatTrien}</p>}
              <p className="phu mt-0.5 truncate">
                {tep.heMay} · bản {tep.soHieu} · {tep.loai}
                {tep.dungLuong != null && ` · ${gonDungLuong(tep.dungLuong)}`}
              </p>
            </div>
          </div>

          {/*
            DÒNG TÀI KHOẢN, y như App Store in địa chỉ Apple ID ở đây.

            Với khách chưa đăng nhập thì đây là chỗ nói thẳng cái họ sắp mất:
            vẫn tải được, nhưng không có sổ nào ghi lại. Nói ở đây chứ không
            chặn lại — bắt đăng nhập mới cho tải là thói của mấy trang chia sẻ
            tệp, không phải của một cửa hàng.
          */}
          <p className="vach mt-3 border-t pt-3 text-[13px] text-mo">
            {taiKhoan
              ? <>Tài khoản: <span className="font-medium text-chu">{taiKhoan}</span></>
              : 'Chưa đăng nhập — vẫn tải được, nhưng game sẽ không vào thư viện của bạn.'}
          </p>
        </div>

        <button type="button" disabled={dangDi}
          onClick={() => { datDangDi(true); router.push(`/tai/${tep.id}`); }}
          className="nut-cai-dam mt-3 w-full">
          <Download size={17} aria-hidden />
          {dangDi ? 'Đang mở…' : 'Xác nhận tải'}
        </button>
      </div>
    </dialog>
  );
}
