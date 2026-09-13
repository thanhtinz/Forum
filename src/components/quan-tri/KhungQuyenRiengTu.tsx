'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { luuQuyenRiengTu, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';
import { LOAI, MUC } from '@/lib/quyen-rieng-tu-const';

export interface KhaiQuyenRiengTu { loai: string; muc: string }

/**
 * Bảng khai quyền riêng tư của một game — mười nhóm dữ liệu × ba mức.
 *
 * Dựng thành LƯỚI Ô TÍCH chứ không ba danh sách chọn rời: người khai phải trả
 * lời cùng một câu hỏi mười lần ("nhóm này đi tới đâu"), mà lưới thì hỏi cả
 * mười cùng lúc và nhìn một cái là thấy chỗ nào còn bỏ trống.
 *
 * Chưa khai thì nói thẳng là chưa khai, và nói luôn rằng bấm Lưu mà không tích
 * ô nào KHÔNG phải là bỏ qua — đó là khai "không thu thập gì", một lời hứa.
 * Người bày hàng phải biết mình đang hứa cái gì trước khi bấm.
 */
export function KhungQuyenRiengTu({ gameId, daKhai, khai }: {
  gameId: string;
  daKhai: boolean;
  khai: KhaiQuyenRiengTu[];
}) {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(luuQuyenRiengTu, {});
  const cham = (loai: string, muc: string) =>
    khai.some((k) => k.loai === loai && k.muc === muc);

  return (
    <form action={gui} className="the space-y-4 p-4">
      <input type="hidden" name="gameId" value={gameId} />

      <p className="phu leading-relaxed">
        {daKhai
          ? 'Trang game đang bày đúng bảng dưới đây cho người tải xem.'
          : 'Game này chưa khai gì, nên trang game đang nói với người tải là chưa ai cho biết. '
            + 'Bấm Lưu mà không tích ô nào nghĩa là khai “không thu thập dữ liệu nào”.'}
      </p>

      {/* Bảng cuộn ngang riêng: bốn cột trên màn 360px thì chữ nhãn bị bóp
          thành từng chữ cái một, mà cuộn ngang cả trang thì hỏng mọi khối khác. */}
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead>
            <tr className="vach border-b">
              <th scope="col" className="py-2 pr-3 text-left font-semibold">Nhóm dữ liệu</th>
              {MUC.map((m) => (
                <th key={m.ma} scope="col" className="px-2 py-2 text-center font-semibold">
                  {m.ten.replace('Dữ liệu ', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOAI.map((l) => (
              <tr key={l.ma} className="vach border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {l.ten}
                  <span className="phu block font-normal">{l.ta}</span>
                </th>
                {MUC.map((m) => (
                  <td key={m.ma} className="px-2 py-2 text-center">
                    <input type="checkbox" name={`o-${l.ma}-${m.ma}`}
                      defaultChecked={cham(l.ma, m.ma)}
                      aria-label={`${l.ten} — ${m.ten}`}
                      className="size-4 accent-[rgb(var(--nhan))]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {kq.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {kq.loi}
        </p>
      )}
      {kq.ok && (
        <p role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-nhan">
          <Check size={15} aria-hidden /> Đã lưu.
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-xam">
        {dangChay ? 'Đang lưu…' : 'Lưu quyền riêng tư'}
      </button>
    </form>
  );
}
