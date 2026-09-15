'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ImagePlus, Loader2, MessageCircle, Send, Trash2, X } from 'lucide-react';
import { docChat, guiChat, xoaChat, type CauChat } from '@/app/(cua-hang)/game/[duongDan]/chat';
import { AnhDaiDien } from '@/components/NguoiDung';
import { NutCamXuc } from '@/components/BangCamXuc';
import { napAnh } from '@/components/quan-tri/ONapAnh';
import { NHIP_MS, TIN_TOI_DA } from '@/lib/chat-const';
import { cachDay, gop } from '@/lib/tien-ich';

/**
 * PHÒNG CHAT CHUNG của một game.
 *
 * Nói xong rồi trôi — xem chú thích model `TinNhanChat` để biết vì sao phòng
 * này không giẫm chân diễn đàn. Ở đây chỉ nói phần giao diện:
 *
 *   • Câu MỚI NHẤT nằm DƯỚI CÙNG, đúng lối mọi phòng chat: mắt người đọc đặt
 *     sẵn ở đáy khung, và ô gõ cũng ở đấy.
 *   • Khung có TRẦN CAO và tự cuộn lấy, không đẩy cả trang dài ra: phòng chat
 *     nằm giữa hai phần khác của diễn đàn, nói nhiều thì nó nuốt mất chúng.
 *   • Chỉ tự cuộn xuống khi người đọc ĐANG ở đáy. Đang cuộn lên đọc lại chuyện
 *     cũ mà cứ mười câu lại bị giật xuống đáy thì không đọc nổi.
 */
export function PhongChat({ gameId, tenGame, banDau, coTheNoi, toiLa, laQuanTri }: {
  gameId: string;
  tenGame: string;
  banDau: CauChat[];
  /** Đã đăng nhập chưa — khách vẫn đọc được, chỉ không gõ được. */
  coTheNoi: boolean;
  /** Tên đăng nhập của người đang xem, để biết câu nào là của mình. */
  toiLa: string | null;
  laQuanTri: boolean;
}) {
  const [cau, datCau] = useState<CauChat[]>(banDau);
  const [chu, datChu] = useState('');
  // Ảnh đính sẵn, chờ bấm gửi: sticker và ảnh động gửi thẳng luôn, còn ảnh tự
  // tải lên thì người ta hay muốn gõ thêm một câu đi kèm.
  const [anhKem, datAnhKem] = useState<string | null>(null);
  const [dangNapAnh, datDangNapAnh] = useState(false);
  const oAnh = useRef<HTMLInputElement>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangGui, batDau] = useTransition();
  const khung = useRef<HTMLDivElement>(null);
  const oDay = useRef(true);

  // Đo TRƯỚC khi vẽ câu mới: sau khi vẽ thì đáy đã dời đi, hỏi lúc ấy là hỏi
  // về một khung khác.
  const nhoChoDung = () => {
    const k = khung.current;
    if (k) oDay.current = k.scrollHeight - k.scrollTop - k.clientHeight < 60;
  };

  useEffect(() => {
    const k = khung.current;
    if (k && oDay.current) k.scrollTop = k.scrollHeight;
  }, [cau]);

  const lamMoi = useCallback(async () => {
    const kq = await docChat(gameId);
    if (kq.cau) { nhoChoDung(); datCau(kq.cau); }
  }, [gameId]);

  /*
   * Hỏi lại theo nhịp, và CHỈ khi tab đang mở.
   *
   * `document.hidden` chặn đúng trường hợp tốn suông nhất: một tab bỏ quên cả
   * buổi vẫn gõ cửa máy chủ tám giây một lần. Quay lại tab thì hỏi ngay một
   * lượt, vì lúc ấy người ta đang nhìn vào khung và chờ thấy chuyện mới.
   */
  useEffect(() => {
    const nhip = setInterval(() => { if (!document.hidden) void lamMoi(); }, NHIP_MS);
    const khiHien = () => { if (!document.hidden) void lamMoi(); };
    document.addEventListener('visibilitychange', khiHien);
    return () => { clearInterval(nhip); document.removeEventListener('visibilitychange', khiHien); };
  }, [lamMoi]);

  const gui = (dinhKem?: string) => {
    const noi = chu.trim();
    const anh = dinhKem ?? anhKem ?? undefined;
    if ((!noi && !anh) || dangGui) return;
    datLoi(null);
    batDau(async () => {
      const kq = await guiChat(gameId, noi, anh);
      if (kq.loi) { datLoi(kq.loi); return; }
      // Chỉ xoá ô gõ khi máy chủ đã nhận: hỏng mà vẫn xoá thì câu vừa gõ mất
      // trắng, và người ta phải nhớ lại mình vừa viết gì.
      datChu('');
      datAnhKem(null);
      nhoChoDung();
      oDay.current = true;
      if (kq.cau) datCau(kq.cau);
    });
  };

  const napTep = async (tep: File | null | undefined) => {
    if (!tep) return;
    datLoi(null);
    datDangNapAnh(true);
    // Ảnh trong phòng chat đi chung ngăn với ảnh bài diễn đàn: cùng một loại
    // ảnh người dùng dán vào, cùng một cửa chặn đếm lượt.
    const kq = await napAnh(tep, 'dien-dan');
    datDangNapAnh(false);
    if (oAnh.current) oAnh.current.value = '';
    if (kq.loi) { datLoi(kq.loi); return; }
    datAnhKem(kq.duongDan ?? null);
  };

  return (
    /*
     * KHÔNG `overflow-hidden` ở thẻ ngoài, dù mấy khối khác trong trang đều có.
     *
     * Bảng cảm xúc mở LÊN TRÊN nút mặt cười, tức là tràn ra ngoài mép thẻ này —
     * cắt viền thì cắt luôn cả bảng, và người bấm chỉ thấy một mẩu. Bù lại,
     * hàng đầu đề phải tự bo hai góc trên cho khớp mép thẻ.
     */
    <section aria-label={`Phòng chat ${tenGame}`} className="the">
      <h2 className="flex items-center gap-2 rounded-t-the border-b border-vien bg-nen3/60 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-mo">
        <MessageCircle size={14} aria-hidden /> Phòng chat
      </h2>

      <div ref={khung} className="max-h-[320px] min-h-[120px] overflow-y-auto px-4 py-3">
        {cau.length === 0 ? (
          <p className="phu py-6 text-center">Chưa ai nói gì. Mở lời đi.</p>
        ) : (
          <ul className="space-y-2.5">
            {cau.map((c) => (
              <li key={c.id} className="group flex items-start gap-2.5">
                <AnhDaiDien ten={c.nguoi.tenHienThi} anh={c.nguoi.anh} co={28} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <Link href={`/thanh-vien/${c.nguoi.tenDangNhap}`}
                      className="truncate text-[13px] font-semibold hover:underline">
                      {c.nguoi.tenHienThi}
                    </Link>
                    <span className="phu shrink-0 text-[11px]">{cachDay(new Date(c.taoLuc))}</span>
                  </p>
                  {/* `break-words`: một chuỗi dài không dấu cách — địa chỉ tệp,
                      mã lỗi — sẽ kéo cả khung rộng ra và đẩy trang trôi ngang. */}
                  {c.noiDung && (
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">
                      {c.noiDung}
                    </p>
                  )}
                  {c.anh && (
                    /* Ảnh trong phòng chat có TRẦN CAO hẳn hoi: một tấm chụp
                       màn hình dựng đứng mà để nguyên cỡ thì nó chiếm trọn
                       khung, đẩy mọi câu khác ra khỏi tầm mắt.
                       eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.anh} alt="" loading="lazy"
                      className="mt-1 max-h-[160px] rounded-nut object-contain" />
                  )}
                </div>

                {(laQuanTri || c.nguoi.tenDangNhap === toiLa) && (
                  <button type="button" aria-label="Gỡ câu này"
                    onClick={() => batDau(async () => {
                      const kq = await xoaChat(c.id);
                      if (kq.loi) datLoi(kq.loi);
                      else datCau((cu) => cu.filter((x) => x.id !== c.id));
                    })}
                    className="shrink-0 text-mo opacity-0 transition-opacity hover:text-xau focus:opacity-100 group-hover:opacity-100">
                    <Trash2 size={13} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-vien px-4 py-3">
        {coTheNoi ? (
          <>
            {anhKem && (
              <div className="relative mb-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={anhKem} alt="" className="max-h-24 rounded-nut border border-vien" />
                <button type="button" onClick={() => datAnhKem(null)} aria-label="Bỏ ảnh đính kèm"
                  className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-xau-dac text-white">
                  <X size={12} aria-hidden />
                </button>
              </div>
            )}

            <div className="flex items-end gap-1.5">
              <NutCamXuc
                chonEmoji={(h) => datChu((c) => (c + h).slice(0, TIN_TOI_DA))}
                chonAnh={(d) => gui(d)} />

              <button type="button" onClick={() => oAnh.current?.click()} disabled={dangNapAnh}
                aria-label="Gửi ảnh"
                className="grid size-[34px] shrink-0 place-items-center rounded-nut text-mo transition-colors hover:bg-nen3 hover:text-chu disabled:opacity-50">
                {dangNapAnh
                  ? <Loader2 size={17} className="animate-spin" aria-hidden />
                  : <ImagePlus size={17} aria-hidden />}
              </button>
              <input ref={oAnh} type="file" accept="image/*" className="sr-only"
                aria-label="Chọn ảnh gửi vào phòng chat"
                onChange={(e) => void napTep(e.target.files?.[0])} />

              <input value={chu} onChange={(e) => datChu(e.target.value)}
                onKeyDown={(e) => {
                  // Enter gửi, Shift+Enter thì thôi — đây là một câu nói, không
                  // phải một bài; bắt bấm chuột cho mỗi câu là quá nhiều tay.
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gui(); }
                }}
                maxLength={TIN_TOI_DA} aria-label="Gõ một câu"
                placeholder={`Nói gì đó về ${tenGame}…`}
                className="o-nhap !min-h-[38px] !py-1.5 !text-[13px]" />
              <button type="button" onClick={() => gui()}
                disabled={dangGui || (!chu.trim() && !anhKem)}
                aria-label="Gửi"
                className="nut-cai-dam shrink-0 !min-h-[38px] !px-3.5">
                <Send size={15} aria-hidden />
              </button>
            </div>
            <p className={gop('phu mt-1 text-[11px]', chu.length > TIN_TOI_DA - 40 && 'text-cam')}>
              {chu.length}/{TIN_TOI_DA}
            </p>
          </>
        ) : (
          <p className="phu">
            <Link href="/dang-nhap" className="font-semibold text-nhan hover:underline">
              Đăng nhập
            </Link>
            {' '}để nói chuyện.
          </p>
        )}

        {loi && <p role="alert" className="mt-1 text-[12px] font-medium text-xau">{loi}</p>}
      </div>
    </section>
  );
}
