'use client';

import { cn } from '@/lib/utils';
import { ANH } from '@/lib/mini-game-const';

/**
 * Chiếu sóc đĩa: cái đĩa, cái bát úp, bốn đồng.
 *
 * Bộ ảnh gốc chỉ có hai tấm chữ "Chẵn"/"Lẻ" nền đen viền đỏ, vừa xấu vừa
 * chẳng nói gì về luật chơi. Lần đầu tôi vẽ lại bằng SVG thì cũng không khá
 * hơn, nên giờ dùng ảnh thật: đĩa và bát lấy từ Food Kit, bốn đồng lấy từ
 * Board Game Pack — cả hai đều của Kenney, giấy phép CC0, ghi trong
 * `public/hoai-niem/socdia/NGUON.txt`.
 *
 * Cả cụm dựng theo MỘT góc nhìn: hơi chếch từ trên xuống, đúng góc người ta
 * ngồi nhìn chiếu bạc. Vì thế lấy bản `_side` của đồng phỉnh chứ không lấy bản
 * nhìn thẳng từ trên — đặt đồng phẳng lên cái đĩa nhìn nghiêng là hỏng phối
 * cảnh ngay.
 */

/** Chỗ nằm của bốn đồng trên mặt đĩa, đặt lệch nhau cho khỏi giống xếp hàng. */
const CHO = [
  { left: '10%', bottom: '17%' },
  { left: '31%', bottom: '20%' },
  { left: '49%', bottom: '15%' },
  { left: '68%', bottom: '18%' },
];

export function DiaSocDia({ dong, xoc, kin, batDangMo }: {
  /** Bốn đồng: 1 là ngửa (đỏ), 0 là sấp (trắng). Rỗng = chưa mở bát. */
  dong: number[];
  /** Đang xóc, cho cả bát rung. */
  xoc?: boolean;
  /** Còn úp bát, chưa được thấy đồng nào. */
  kin?: boolean;
  /** Đang nhấc bát lên. */
  batDangMo?: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[8/5] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-800 to-emerald-950 shadow-inner">
      {/* Bốn đồng nằm trên mặt đĩa. Vẽ TRƯỚC đĩa để mép đĩa che chân đồng. */}
      {!kin && CHO.map((cho, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={`${ANH}/socdia/dong-${dong[i] === 1 ? 'ngua' : 'sap'}.png`}
          alt="" aria-hidden className="absolute w-[21%] drop-shadow" style={cho} />
      ))}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ANH}/socdia/dia.png`} alt="" aria-hidden
        className="absolute bottom-[12%] left-[8%] w-[84%] drop-shadow-lg" />

      {(kin || batDangMo) && (
        // Phần căn giữa để Ở NGOÀI, hoạt cảnh áp lên ảnh bên trong: cả hai đều
        // dùng `transform`, gộp chung một thẻ là hoạt cảnh xoá luôn phép căn
        // giữa và cái bát trôi hẳn ra mép khung.
        <span className="absolute bottom-[15%] left-1/2 w-[58%] -translate-x-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ANH}/socdia/bat.png`} alt="Bát úp trên đĩa"
            className={cn('w-full drop-shadow-xl', xoc && 'soc-rung', batDangMo && 'soc-mo')} />
        </span>
      )}
    </div>
  );
}
