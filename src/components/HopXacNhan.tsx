'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CauHoi {
  loi: string;
  nguyHiem: boolean;
  tra: (dong: boolean) => void;
}

/**
 * HỘP XÁC NHẬN — thay cho `window.confirm`.
 *
 * VÌ SAO BỎ HỘP CỦA TRÌNH DUYỆT. Nó chặn hẳn luồng, và đấy là điểm mạnh duy
 * nhất của nó — thứ hộp này giữ lại được bằng `<dialog>` mở kiểu modal. Còn
 * lại thì toàn điểm yếu: nó in tên miền của trang lên đầu hộp như một lời cảnh
 * báo, hai cái nút mang chữ của hệ điều hành nên trên máy đặt tiếng Anh thì
 * giữa một cửa hàng toàn tiếng Việt hiện ra "Cancel / OK", và không cách nào
 * bôi đỏ cái nút xoá để tách nó khỏi nút huỷ. Trên iOS thì hộp ấy còn trườn
 * lên từ đáy màn hình với dáng của Safari, chẳng liên quan gì tới trang.
 *
 * DÙNG NHƯ MỘT LỜI HỎI CÓ CHỜ:
 *
 *     const { hoi, hop } = useXacNhan();
 *     …
 *     if (!(await hoi('Xoá hẳn chủ đề này?', true))) return;
 *     …
 *     return <>… {hop}</>;
 *
 * Đọc gần y như `window.confirm`, nên chỗ gọi không phải xếp lại luồng — chỉ
 * thêm một `await`. Và vì nó trả về `Promise`, hai lượt hỏi không bao giờ
 * chồng lên nhau: lượt sau chờ lượt trước trả lời xong.
 */
export function useXacNhan() {
  const [cauHoi, datCauHoi] = useState<CauHoi | null>(null);
  const hopRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (cauHoi && !hop.open) hop.showModal();
    if (!cauHoi && hop.open) hop.close();
  }, [cauHoi]);

  const hoi = useCallback(
    (loi: string, nguyHiem = false) =>
      new Promise<boolean>((tra) => { datCauHoi({ loi, nguyHiem, tra }); }),
    [],
  );

  const tralai = (dong: boolean) => {
    cauHoi?.tra(dong);
    datCauHoi(null);
  };

  const hop = (
    /*
     * Bấm ra ngoài hộp là HUỶ, y như iOS. Bắt trên chính `dialog` vì lớp phủ
     * `::backdrop` không nhận được sự kiện riêng — cú bấm vào nó rơi vào phần
     * tử `dialog`, còn cú bấm vào ruột hộp thì rơi vào mấy thẻ con.
     */
    <dialog ref={hopRef}
      onClose={() => tralai(false)}
      onClick={(e) => { if (e.target === hopRef.current) tralai(false); }}
      className="hop-xac-nhan text-chu backdrop:bg-black/40">
      <div className="p-5 text-center">
        <p className="text-[15px] font-bold leading-snug">{cauHoi?.loi}</p>
      </div>

      {/*
        Hai nút xếp NGANG và chia đôi bề ngang, vạch mảnh ở giữa — đúng dáng
        hộp cảnh báo của iOS. Nút huỷ nằm BÊN TRÁI và là nút được chọn sẵn:
        thao tác nguy hiểm thì mặc định phải là "thôi".
      */}
      <div className="vach grid grid-cols-2 border-t">
        <button type="button" data-viec="thoi" onClick={() => tralai(false)} autoFocus
          className="border-r border-vien py-3 text-[15px] font-semibold text-chu transition-colors hover:bg-nen3">
          Thôi
        </button>
        <button type="button" data-viec="dong-y" onClick={() => tralai(true)}
          className={`py-3 text-[15px] font-bold transition-colors hover:bg-nen3 ${
            cauHoi?.nguyHiem ? 'text-xau' : 'text-nhan'
          }`}>
          {cauHoi?.nguyHiem ? 'Xoá' : 'Đồng ý'}
        </button>
      </div>
    </dialog>
  );

  return { hoi, hop };
}
