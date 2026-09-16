'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowUp, ImagePlus, Loader2, Star, X } from 'lucide-react';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { chamSao } from '@/app/(cua-hang)/game/[duongDan]/viec';
import { NutCamXuc } from '@/components/BangCamXuc';
import { napAnh } from '@/components/quan-tri/ONapAnh';
import { gop } from '@/lib/tien-ich';

/**
 * TẤM "VIẾT ĐÁNH GIÁ" — đúng tấm App Store mở ra khi bấm Write a Review.
 *
 * VÌ SAO TÁCH RA KHỎI TRANG: bản trước để cả ô chữ nằm thẳng trong mục đánh
 * giá, và nó đẩy mọi bài của người khác xuống dưới một màn hình. Mà phần đánh
 * giá trước hết là chỗ ĐỌC — người đang cân nhắc tải vào đây để nghe người
 * khác nói, không phải để viết. Việc viết chỉ là việc của một người trong
 * nghìn người ghé qua, nên nó thuộc về một tấm mở ra khi cần.
 *
 * Đầu đề là ô RIÊNG, không phải dòng đầu của lời bình: có nó thì thẻ trên kệ
 * mới có một câu in đậm để liếc, xem `BaiDanhGia`.
 *
 * Dùng <dialog> thật với `showModal()` cho sẵn bẫy tiêu điểm, phím Esc và chặn
 * cuộn phía sau; tự dựng lớp phủ bằng div thì lần nào cũng thiếu một trong ba.
 */
export function TamVietDanhGia({
  gameId, tenGame, icon, tacGia, banDau, mo, dongLai,
}: {
  gameId: string;
  tenGame: string;
  icon: string | null;
  tacGia: string;
  banDau: { sao: number; tieuDe: string | null; noiDung: string | null; anh?: string | null } | null;
  /** Sao người ta vừa bấm ngoài trang; `0` là mở tấm mà chưa chọn gì. */
  mo: number | null;
  dongLai: () => void;
}) {
  const hopRef = useRef<HTMLDialogElement>(null);
  const [sao, datSao] = useState(banDau?.sao ?? 0);
  const [de, datDe] = useState(banDau?.tieuDe ?? '');
  const [chu, datChu] = useState(banDau?.noiDung ?? '');
  const [anh, datAnh] = useState(banDau?.anh ?? '');
  const [dangNapAnh, datDangNapAnh] = useState(false);
  const oAnh = useRef<HTMLInputElement>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [xong, datXong] = useState(false);
  const [dangGui, batDau] = useTransition();

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (mo !== null) {
      // Sao bấm ngoài trang phải theo vào tấm, nếu không thì người ta bấm 4 sao
      // rồi thấy tấm mở ra trống trơn và tưởng cú bấm ấy rơi mất.
      if (mo > 0) { datSao(mo); datXong(false); }
      if (!hop.open) hop.showModal();
    } else if (hop.open) {
      hop.close();
    }
  }, [mo]);

  const gui = () => {
    if (sao < 1) { datLoi('Hãy chọn từ 1 đến 5 sao.'); return; }
    datLoi(null);
    batDau(async () => {
      const r = await chamSao(gameId, sao, chu, de, anh);
      if (r.loi) { datLoi(r.loi); return; }
      datXong(true);
      // Đóng ngay sau khi lưu: tấm này không có gì để xem tiếp, mà bài vừa viết
      // thì đang nằm sẵn ở kệ phía sau.
      dongLai();
    });
  };

  const napTep = async (tep: File | null | undefined) => {
    if (!tep) return;
    datLoi(null);
    datDangNapAnh(true);
    // Đi chung ngăn với ảnh bài diễn đàn: cùng loại ảnh người dùng dán vào,
    // cùng cửa chặn đếm lượt.
    const kq = await napAnh(tep, 'dien-dan');
    datDangNapAnh(false);
    if (oAnh.current) oAnh.current.value = '';
    if (kq.loi) { datLoi(kq.loi); return; }
    datAnh(kq.duongDan ?? '');
    datXong(false);
  };

  const nhanGui = banDau ? 'Cập nhật đánh giá' : 'Gửi đánh giá';

  return (
    <dialog ref={hopRef} onClose={dongLai}
      className="tam-truot w-full max-w-[480px] text-chu backdrop:bg-black/40">
      <div className="flex max-h-[86vh] flex-col">
        <header className="kinh-tren sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3.5">
          <button type="button" onClick={dongLai} aria-label="Đóng" className="nut-tron shrink-0">
            <X size={18} aria-hidden />
          </button>
          <h2 className="tieu-de-nho min-w-0 flex-1 truncate text-center">Viết đánh giá</h2>
          {/* Mũi tên gửi ở góc phải, đúng chỗ App Store để nó. Mờ đi khi chưa
              chấm sao vì chấm sao mới là phần bắt buộc — chữ thì không. */}
          <button type="button" onClick={gui} disabled={dangGui || sao < 1}
            aria-label={nhanGui}
            className={gop('grid size-9 shrink-0 place-items-center rounded-full transition-colors',
              sao >= 1 ? 'bg-nhan text-white' : 'bg-nen3 text-mo')}>
            <ArrowUp size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
          <div className="flex items-center gap-3 pt-1">
            <BieuTuongGame ten={tenGame} icon={icon} co={52} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold">{tenGame}</p>
              <p className="phu truncate">{tacGia}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-[14px] font-semibold">Chấm sao:</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                /* Nhãn khác hẳn hàng sao ngoài trang ("N sao") để hai hàng
                   không lẫn vào nhau — bộ đọc màn hình lẫn bài kiểm đều cần
                   gọi đúng một trong hai. */
                <button key={n} type="button" onClick={() => { datSao(n); datXong(false); }}
                  aria-label={`Chấm ${n} sao`} aria-pressed={sao === n}
                  className="p-0.5 transition-transform hover:scale-110">
                  <Star size={30} className={gop(n <= sao ? 'fill-nhan text-nhan' : 'fill-transparent text-nhan')} />
                </button>
              ))}
            </div>
          </div>

          {/* Hai ô trong CÙNG một khối bo góc, ngăn nhau bằng một vạch — dáng
              bảng nhập của iOS. Hai ô rời thì tấm này trông như một cái biểu
              mẫu hành chính chứ không như chỗ nói dăm câu về một game. */}
          <div className="the-noi mt-4 overflow-hidden">
            <label className="flex items-center gap-3 px-3.5 py-3">
              <span className="w-20 shrink-0 text-[14px] font-semibold">Tiêu đề</span>
              <input value={de} onChange={(e) => { datDe(e.target.value); datXong(false); }}
                maxLength={80} placeholder="Không bắt buộc"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-mo" />
            </label>
            <label className="vach flex gap-3 border-t px-3.5 py-3">
              <span className="w-20 shrink-0 pt-0.5 text-[14px] font-semibold">Đánh giá</span>
              <textarea value={chu} onChange={(e) => { datChu(e.target.value); datXong(false); }}
                rows={5} maxLength={2000}
                placeholder="Máy bạn chạy có mượt không? Có lỗi gì không? (không bắt buộc)"
                className="min-w-0 flex-1 resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-mo" />
            </label>
          </div>

          {/*
            Hàng nút đặt NGAY DƯỚI ô chữ, không nhét vào trong khối bo góc kia:
            khối ấy là dáng bảng nhập của iOS, thêm một hàng nút vào giữa là
            hỏng đúng cái dáng ấy.
          */}
          <div className="mt-2 flex items-center gap-1.5">
            {/* Mở LÊN TRÊN: nút nằm gần đáy tấm, mở xuống là bảng thò hẳn ra
                ngoài mép tấm và đè lên trang phía sau — đã thấy tận mắt. */}
            <NutCamXuc
              chonEmoji={(h) => { datChu((c) => (c + h).slice(0, 2000)); datXong(false); }}
              chonAnh={(d) => { datAnh(d); datXong(false); }} />
            <button type="button" onClick={() => oAnh.current?.click()} disabled={dangNapAnh}
              aria-label="Đính ảnh vào bài đánh giá"
              className="grid size-[34px] shrink-0 place-items-center rounded-nut text-mo transition-colors hover:bg-nen3 hover:text-chu disabled:opacity-50">
              {dangNapAnh
                ? <Loader2 size={17} className="animate-spin" aria-hidden />
                : <ImagePlus size={17} aria-hidden />}
            </button>
            <input ref={oAnh} type="file" accept="image/*" className="sr-only"
              aria-label="Chọn ảnh cho bài đánh giá"
              onChange={(e) => void napTep(e.target.files?.[0])} />
          </div>

          {anh && (
            <div className="relative mt-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anh} alt="" className="max-h-32 rounded-nut border border-vien" />
              <button type="button" onClick={() => { datAnh(''); datXong(false); }}
                aria-label="Bỏ ảnh đính kèm"
                className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-xau-dac text-white">
                <X size={12} aria-hidden />
              </button>
            </div>
          )}

          <p className="phu mt-3">
            Đánh giá đăng dưới tên tài khoản của bạn và ai cũng đọc được. Chấm lại
            lúc nào cũng được — bài mới thay bài cũ chứ không cộng thêm.
          </p>

          {loi && <p role="alert" className="mt-3 text-[13px] font-semibold text-xau">{loi}</p>}
          {xong && <p className="mt-3 text-[13px] font-semibold text-nhan">Đã lưu. Cảm ơn bạn!</p>}

          <button type="button" onClick={gui} disabled={dangGui || sao < 1}
            className="nut-cai-dam mt-4 w-full">
            {dangGui ? 'Đang gửi…' : banDau ? 'Cập nhật' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
