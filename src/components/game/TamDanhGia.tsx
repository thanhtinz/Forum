'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { BaiDanhGia } from '@/components/game/BaiDanhGia';
import { PhoDiem } from '@/components/game/PhoDiem';
import { layDanhGia, type BaiXem } from '@/app/(cua-hang)/game/[duongDan]/viec';
import { gonSo, gop } from '@/lib/tien-ich';

const SAP = [
  { ma: 'huuIch', ten: 'Hữu ích nhất' },
  { ma: 'moi', ten: 'Mới nhất' },
  { ma: 'cao', ten: 'Điểm cao' },
  { ma: 'thap', ten: 'Điểm thấp' },
] as const;

/*
 * TẤM TRƯỢT "TẤT CẢ ĐÁNH GIÁ".
 *
 * Trang game bày năm bài mới nhất rồi mời đọc tiếp. Đọc tiếp ở ĐÂY chứ không
 * sang trang khác: người đang cân nhắc tải hay đọc vài bài rồi ngước lên nhìn
 * lại nút tải và cỡ tệp, mà rời trang thì mất chỗ đang đứng — quay lại phải
 * cuộn tìm từ đầu.
 *
 * Nút mở vẫn là một <a> trỏ tới `/game/…/danh-gia`, và chỉ bị chặn lại khi
 * JavaScript chạy được. Máy cũ tắt JS — đúng loại máy hay mở một cửa hàng game
 * Java — vẫn đọc được hết, chỉ là ở một trang riêng.
 *
 * Dùng <dialog> thật với `showModal()`: nó mang sẵn bẫy tiêu điểm, đóng bằng
 * Esc và chặn cuộn phía sau. Tự dựng lớp phủ bằng div thì lần nào cũng thiếu
 * một trong ba thứ ấy.
 */
export function TamDanhGia({
  gameId, duongDan, tong, sao, phanBo, banDau, dangLien, banHienTai, nguoiXemId,
}: {
  gameId: string;
  /** Người đang xem, `null` là khách — chỉ để biết có mời bấm "Hữu ích" không. */
  nguoiXemId: string | null;
  duongDan: string;
  /** Tổng số đánh giá của game, kể cả bài chỉ chấm sao không viết chữ. */
  tong: number;
  sao: number;
  phanBo: Record<number, number>;
  /*
   * Mấy bài đã dựng sẵn ở trang — khỏi phải gọi lại ngay lúc mở.
   *
   * Tấm này mở được KỂ CẢ khi trang đã bày đủ mọi bài, và đó là chủ ý: ngoài
   * việc đọc tiếp, nó còn là chỗ duy nhất lọc được theo sao, đổi cách sắp và
   * xem riêng bản hiện tại. Game mới có ba bài đánh giá thì ba bài ấy vẫn đáng
   * được lọc, mà đầu mục mất mũi tên thì không ai vào được tới đó.
   */
  banDau: BaiXem[];
  /**
   * Số hiệu bản MỚI NHẤT của game, để mời lọc "chỉ bản này".
   *
   * Rỗng thì không bày chip ấy: game chưa có bản tải nào thì mọi bài đánh giá
   * đều không mang số hiệu, và một cái chip lọc ra danh sách rỗng thì chỉ làm
   * người ta tưởng trang hỏng.
   */
  banHienTai?: string | null;
  /**
   * Dáng ĐẦU MỤC: chính chữ "Đánh giá" là lối đi, kèm mũi tên bên cạnh.
   *
   * App Store làm thế với "Ratings & Reviews ›" thay vì để một nút to ở cuối
   * mục: người đọc lướt qua đầu mục là đã biết có chỗ xem hết, còn nút ở cuối
   * thì phải cuộn hết mấy bài mẫu mới gặp — mà cuộn hết rồi thì cũng chẳng cần
   * "xem tất cả" nữa. Không truyền thì vẫn là nút viền chiếm cả bề ngang, dáng
   * dùng ở chỗ không có đầu mục nào để mượn.
   */
  dangLien?: boolean;
}) {
  const hopRef = useRef<HTMLDialogElement>(null);
  const [mo, datMo] = useState(false);
  const [bai, datBai] = useState<BaiXem[]>(banDau);
  const [conLai, datConLai] = useState(Math.max(0, tong - banDau.length));
  const [locSao, datLocSao] = useState<number | null>(null);
  // Mặc định "hữu ích nhất", khớp với thứ tự kệ ở trang game — mở tấm ra mà
  // thứ tự nhảy đi một kiểu khác thì người ta tưởng mất bài vừa đọc.
  const [sap, datSap] = useState<string>('huuIch');
  const [chiBanNay, datChiBanNay] = useState(false);
  const [trang, datTrang] = useState(1);
  const [dangTai, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (mo && !hop.open) hop.showModal();
    if (!mo && hop.open) hop.close();
  }, [mo]);

  /** Nạp một trang. `noiTiep` là true khi bấm "Tải thêm". */
  const nap = useCallback((s: number | null, c: string, t: number, noiTiep: boolean, ban?: string | null) => {
    datLoi(null);
    batDau(async () => {
      try {
        const kq = await layDanhGia(gameId, { sao: s, sap: c, trang: t, ban: ban ?? null });
        datBai((cu) => (noiTiep ? [...cu, ...kq.bai] : kq.bai));
        datConLai(kq.tong - (noiTiep ? bai.length + kq.bai.length : kq.bai.length));
        datTrang(t);
      } catch {
        // Mạng chập chờn là chuyện thường ở đúng nhóm máy dùng cửa hàng này.
        // Nói ra và để nguyên danh sách đang đọc, đừng xoá trắng nó.
        datLoi('Không tải được thêm đánh giá. Thử lại giúp mình nhé.');
      }
    });
  }, [gameId, bai.length]);

  const doiLoc = (s: number | null, c: string, banNay = chiBanNay) => {
    datLocSao(s);
    datSap(c);
    datChiBanNay(banNay);
    nap(s, c, 1, false, banNay ? banHienTai : null);
  };

  return (
    <>
      <a href={`/game/${duongDan}/danh-gia`}
        aria-label={dangLien ? `Xem tất cả ${gonSo(tong)} đánh giá` : undefined}
        className={dangLien
          ? 'tieu-de flex shrink-0 items-center gap-0.5 hover:opacity-70'
          : 'nut-vien mt-5 w-full'}
        onClick={(e) => {
          // Chuột giữa, Ctrl/Cmd + bấm: để trình duyệt mở tab mới như thường.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          datMo(true);
        }}>
        {dangLien
          ? <>Đánh giá<ChevronRight size={20} className="text-mo" aria-hidden /></>
          : `Xem tất cả ${gonSo(tong)} đánh giá`}
      </a>

      <dialog ref={hopRef} onClose={() => datMo(false)}
        className="tam-truot w-full max-w-[560px] text-chu backdrop:bg-black/40">
        <div className="flex max-h-[86vh] flex-col">
          {/* Đầu tấm dính lại khi cuộn nên nó phải là kính luôn: một dải đặc nằm
              trên một tấm kính thì lộ ra ngay là hai vật liệu khác nhau. */}
          <header className="kinh-tren sticky top-0 z-10 flex items-start gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <h2 className="tieu-de-nho">Đánh giá</h2>
              <p className="phu mt-0.5">{gonSo(tong)} bài từ người đã tải</p>
            </div>
            <button type="button" onClick={() => datMo(false)} aria-label="Đóng"
              className="nut-tron shrink-0">
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
            <div className="pt-4">
              <PhoDiem sao={sao} tong={tong} phanBo={phanBo} locSao={locSao}
                dungDuong={() => '#'} />
            </div>

            {/*
              HAI HÀNG CHIP CUỘN NGANG, không xuống dòng.

              Xuống dòng thì sáu chip lọc sao chiếm hai hàng, cộng hàng sắp xếp
              nữa là ba hàng nút trước khi tới bài đánh giá đầu tiên — mở tấm
              ra chỉ thấy toàn nút. Cuộn ngang giữ mỗi thứ đúng một hàng, đúng
              lối cửa hàng trên điện thoại.
            */}
            <div className="ke -mx-4 mt-3 gap-2 px-4">
              {[null, 5, 4, 3, 2, 1].map((s) => (
                <button key={s ?? 'tat-ca'} type="button" onClick={() => doiLoc(s, sap)}
                  className={gop('chip', locSao === s && 'chip-chon')}>
                  {s === null ? 'Tất cả' : `${s} sao`}
                </button>
              ))}
            </div>

            <div className="ke vach -mx-4 mt-2.5 gap-2 border-t px-4 pt-2.5">
              {SAP.map((c) => (
                <button key={c.ma} type="button" onClick={() => doiLoc(locSao, c.ma)}
                  className={gop('chip', sap === c.ma && 'chip-chon')}>
                  {c.ten}
                </button>
              ))}

              {/*
                LỌC THEO PHIÊN BẢN — chip cuối hàng sắp xếp.

                Một game bị chê nát ở bản 1.0 rồi vá sạch lỗi ở bản 2.0 thì
                điểm trung bình vẫn kéo lê mấy bài cũ, mà người đang cân nhắc
                tải bản 2.0 không có cách nào nghe tiếng nói về ĐÚNG bản họ sắp
                tải. App Store cho đổi giữa "mọi phiên bản" và "bản hiện tại"
                đúng vì chuyện ấy.
              */}
              {banHienTai && (
                <button type="button" onClick={() => doiLoc(locSao, sap, !chiBanNay)}
                  className={gop('chip shrink-0', chiBanNay && 'chip-chon')}>
                  Chỉ bản {banHienTai}
                </button>
              )}
            </div>

            {bai.length === 0 ? (
              <p className="phu mt-6">
                {locSao ? `Chưa có bài nào ${locSao} sao.` : 'Chưa ai đánh giá game này.'}
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {bai.map((d) => (
                  <li key={d.id} className="vach pt-4 first:border-0 first:pt-0">
                    {/* Trong tấm trượt thì không bày nút trả lời: đây là chỗ
                        ĐỌC, còn trả lời làm ở ngay trang game. */}
                    <BaiDanhGia d={d} nguoiXemId={nguoiXemId} banDauBam={d.toiDaBam} />
                  </li>
                ))}
              </ul>
            )}

            {loi && (
              <p role="alert" className="mt-4 text-[13px] font-medium text-xau">{loi}</p>
            )}

            {conLai > 0 && (
              <button type="button" disabled={dangTai}
                onClick={() => nap(locSao, sap, trang + 1, true, chiBanNay ? banHienTai : null)}
                className="nut-xam mt-5 w-full">
                {dangTai ? 'Đang tải…' : `Tải thêm ${gonSo(conLai)} đánh giá`}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
