'use client';

import { useActionState, useRef, useEffect } from 'react';

export interface KetQuaGui { loi?: string }

/**
 * Biểu mẫu gửi bằng server action, kèm chỗ in lỗi và nút tự khoá khi đang gửi.
 *
 * Tự xoá ô nhập sau khi gửi THÀNH CÔNG (không có lỗi trả về). Không xoá thì
 * người ta bấm gửi hai lần vì tưởng lần đầu trượt, và bài bị đăng đôi.
 */
export function BieuMauGui({ viec, nut, nutDangChay, xoaSauKhiGui, children, className }: {
  viec: (truoc: KetQuaGui, form: FormData) => Promise<KetQuaGui>;
  nut: string;
  nutDangChay?: string;
  xoaSauKhiGui?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [ketQua, gui, dangChay] = useActionState<KetQuaGui, FormData>(viec, {});
  const ref = useRef<HTMLFormElement>(null);
  const truocDo = useRef(dangChay);

  useEffect(() => {
    // Vừa chạy xong (chuyển từ đang chạy sang không) mà không có lỗi = gửi được.
    if (truocDo.current && !dangChay && !ketQua.loi && xoaSauKhiGui) ref.current?.reset();
    truocDo.current = dangChay;
  }, [dangChay, ketQua.loi, xoaSauKhiGui]);

  return (
    <form ref={ref} action={gui} className={className ?? 'space-y-3'}>
      {children}
      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}
      <button type="submit" disabled={dangChay} className="nut-cai-dam !min-h-[40px] !px-6 !text-[14px]">
        {dangChay ? (nutDangChay ?? 'Đang gửi…') : nut}
      </button>
    </form>
  );
}
