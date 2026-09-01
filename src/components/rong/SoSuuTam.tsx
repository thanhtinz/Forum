import type { SuuTam } from '@/lib/rong';
import { DU_BO, LOAI, MAU_TEN, anhRong } from '@/lib/rong-const';
import { cn } from '@/lib/utils';
import { MocSuuTam } from './MocSuuTam';
import { TheHe } from './TheHe';

/**
 * Sổ sưu tầm 54 con — chín loài, mỗi loài sáu màu.
 *
 * Không phải thành phần trình duyệt: cả sổ chỉ là ảnh và chữ, không có nút nào.
 */
export function SoSuuTam({ d }: { d: SuuTam }) {
  return (
    <div className="space-y-4">
      <MocSuuTam daCo={d.daCo} mocDaNhan={d.mocDaNhan} />

      <section className="rong-tam p-4">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="zib-title">Sổ sưu tầm</h2>
          <span className="retro-sub text-ink-400">
            Đã có <b className="rong-nhan">{d.daCo}</b>/{DU_BO} con
          </span>
        </div>
        <p className="retro-sub mb-3 text-ink-400">
          Con nào từng nở là sáng lên, kể cả khi đã thả về trời.
        </p>

        <div className="space-y-3">
          {LOAI.map((l) => (
            <div key={l.id}>
              <p className="mb-1 flex flex-wrap items-center gap-1.5 text-sm font-bold">
                {l.ten} <TheHe he={l.he} />
                <span className="retro-sub font-normal text-ink-400">{l.moTa}</span>
              </p>
              {/* Sáu màu của một loài phải nằm trọn MỘT hàng. Xếp tự do thì ở
                  390px vừa đúng năm con một hàng, con thứ sáu rơi xuống dòng dưới
                  đứng một mình — chín loài là chín cái đuôi thừa. */}
              <ul className="grid grid-cols-6 gap-1.5 sm:flex sm:flex-wrap">
                {MAU_TEN.map((tenMau, i) => {
                  const mau = i + 1;
                  const co = d.boSuuTap.includes(`${l.id}-${mau}`);
                  return (
                    <li key={mau}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={anhRong(l.id, mau)}
                        alt={co ? `${l.ten} ${tenMau} — đã có` : `${l.ten} ${tenMau} — chưa có`}
                        title={co ? `${l.ten} ${tenMau}` : 'Chưa sưu tầm được'}
                        // Chưa có thì làm xám và mờ VỪA PHẢI. Mờ quá thì cả hàng
                        // thành một vệt xám, không còn thấy con nào khác con nào —
                        // mà nhìn trước con mình sắp săn chính là cái thú của sổ.
                        className={cn('h-auto w-full max-w-14 object-contain transition-all sm:size-14',
                          co ? '' : 'opacity-45 grayscale contrast-75')}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
