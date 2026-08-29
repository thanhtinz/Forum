'use client';

import type { ODat as ODatDL } from '@/lib/farm';
import {
  ANH_MAY_1, ANH_MAY_2, ANH_NEN_DEM, ANH_NEN_NGAY,
  NEN_CAO, NEN_DAI_CANH, NEN_RONG, O_DAT_TOI_DA, TROI_DEM, TROI_NGAY,
} from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';
import { ODat, ODatKhoa } from './ODat';

/**
 * Mảnh ruộng — trời, rặng cây, hàng rào, rồi tới thửa đất có luống.
 *
 * Cảnh dựng bằng BA LỚP CHỒNG DỌC chứ không phải một tấm ảnh kéo giãn:
 *
 *   1. Trời  — dải chuyển màu CSS, cao bao nhiêu cũng được. Kết thúc đúng
 *      bằng màu trời của tấm nền nên chỗ giáp lớp 2 không thành vạch ngang.
 *   2. Rặng cây và hàng rào — 51 hàng cuối của `nennongtrai.png`, lặp ngang.
 *      Chỉ lấy phần có cảnh: phần trời trơn phía trên tấm ảnh bỏ đi, để lớp 1
 *      lo. Bản trước lặp cả tấm nên mỗi lần lặp lôi theo cả một khoảng trời
 *      và mấy thửa ruộng xa, chỗ nối lộ hẳn ra.
 *   3. Thửa đất — nền đất CSS cùng tông với bộ ảnh, các ô đất xếp thành luống
 *      đứng trên đó.
 *
 * Nền vẽ ×2 còn cây cối trước mặt ×3: vật ở xa nhỏ hơn vật ở gần, mắt tự hiểu
 * đó là chiều sâu — mà vẫn là bội số nguyên nên không tấm nào bị nhoè.
 */

/** Bội số phóng của lớp nền ở xa. */
const PHONG_NEN = 2;

/**
 * Chiều cao phần chân ô (thanh tiến độ, đồng hồ, nhãn) tính bằng điểm ảnh.
 *
 * Dải luống của hàng gióng theo con số này để luôn nằm đúng chân cây; `ODat`
 * cũng ghim cùng chiều cao ấy, hai bên phải khớp nhau.
 */
const CHAN_O = 18;

/**
 * Sao đêm, toạ độ ghi cứng theo phần trăm.
 *
 * Rắc bằng `Math.random()` thì máy chủ dựng ra một bầu trời, trình duyệt dựng
 * ra một bầu trời khác, React kêu sai lệch ngay lần dựng đầu.
 */
const SAO: ReadonlyArray<[number, number, number]> = [
  [6, 22, 0], [15, 46, 1.1], [23, 14, 0.4], [34, 58, 1.7], [41, 28, 0.8],
  [52, 12, 2.1], [58, 44, 0.2], [67, 24, 1.4], [74, 52, 0.6], [83, 18, 1.9],
  [90, 38, 1.2], [96, 10, 0.5],
];

interface Props {
  oDat: ODatDL[];
  /** Đồng hồ do trang giữ, nhích mỗi giây. */
  now: number;
  banNgay: boolean;
  dangChon: number | null;
  onChon: (index: number) => void;
  /** Giá mở ô tiếp theo; `null` là đã kịch trần. */
  giaMoO: number | null;
  duTienMoO: boolean;
  dangLam: boolean;
  onMua: () => void;
}

export function ManhDat({
  oDat, now, banNgay, dangChon, onChon, giaMoO, duTienMoO, dangLam, onMua,
}: Props) {
  const [troiTren, troiDuoi] = banNgay ? TROI_NGAY : TROI_DEM;

  /*
   * Bày thêm bao nhiêu ô chưa mở: chỉ đủ cho ĐẦY HÀNG đang dở rồi thêm một
   * hàng nữa, tối đa tới trần. Bày sẵn cả tám ô hoang thì mảnh đất trông như
   * bỏ hoang, mà không bày ô nào thì người chơi chẳng thấy đường mở rộng.
   */
  const soO = oDat.length;
  const soHienRa = Math.min(O_DAT_TOI_DA, Math.ceil((soO + 1) / 4) * 4);

  // Xếp thành từng hàng bốn ô: dải luống vẽ theo hàng nên phải biết hàng nào
  // gồm những ô nào, chứ một lưới phẳng thì không có chỗ móc dải luống vào.
  const hang: { soTT: number; o: ODatDL | null }[][] = [];
  for (let i = 0; i < soHienRa; i += 4) {
    hang.push(
      Array.from({ length: Math.min(4, soHienRa - i) }, (_, j) => ({
        soTT: i + j + 1,
        o: oDat[i + j] ?? null,
      })),
    );
  }

  return (
    <div className="farm-khung relative select-none">
      <div className="farm-canh relative overflow-hidden rounded-[10px]">
      <style>{`
        .farm-canh { --px: 2px; }
        @media (min-width: 640px) { .farm-canh { --px: 3px; } }

        /*
         * Khung gỗ quanh thửa ruộng.
         *
         * Trước đây cảnh ruộng tràn hết bề ngang thẻ, không có mép, nên nó
         * trôi tuột vào phần trang phía dưới — nhìn ra một tấm ảnh dán lên
         * trang chứ không ra một khoảnh đất có bờ. Khung này là bờ ấy: bốn
         * nẹp gỗ, trong lòng hơi lõm xuống cho có chiều sâu.
         */
        .farm-khung {
          padding: 6px;
          border-radius: 14px;
          background-image:
            repeating-linear-gradient(90deg,
              rgba(0,0,0,.07) 0 2px, rgba(255,255,255,.05) 2px 6px),
            linear-gradient(180deg, #a9702f 0%, #8a5620 45%, #6d4116 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.28),
            inset 0 -2px 0 rgba(0,0,0,.30),
            0 1px 2px rgba(0,0,0,.18);
        }
        .farm-canh {
          box-shadow:
            inset 0 2px 5px rgba(0,0,0,.45),
            inset 0 -1px 0 rgba(255,255,255,.10);
        }

        /*
         * Luống của riêng từng ô: một khoảnh lõm để mắt biết cây nào trồng ở
         * chỗ nào. Chỉ hiện khi rê chuột hoặc đang chọn — lúc nào cũng vẽ thì
         * bốn khung vuông đè lên nhau át mất chính mấy cái cây.
         */
        .farm-o {
          border-radius: 8px;
          transition: background-color .18s ease, box-shadow .18s ease;
        }
        .farm-o:hover:not(:disabled) {
          background-color: rgba(255,255,255,.09);
          box-shadow: inset 0 0 0 2px rgba(255,244,200,.45);
        }
        .farm-o[data-chon="1"] {
          background-color: rgba(255,214,102,.16);
          box-shadow:
            inset 0 0 0 2px rgba(255,206,84,.95),
            0 0 10px rgba(255,196,60,.45);
        }
        @media (prefers-reduced-motion: reduce) { .farm-o { transition: none; } }

        /*
         * Bệ trồng: khoảnh đất có bờ, bốn ô nằm gọn bên trong.
         *
         * Nẹp gỗ chỉ ở hai bên và đáy — mặt trên để hở thì cây mọc vượt lên
         * khỏi bờ được, đóng kín cả bốn mặt là thành cái hộp úp lên cây.
         */
        .farm-be {
          padding: 0 6px 4px;
          border-radius: 4px 4px 7px 7px;
          background-image: linear-gradient(180deg,
            rgba(0,0,0,.16) 0%, rgba(0,0,0,.28) 62%, rgba(0,0,0,.16) 100%);
          box-shadow:
            inset 3px 0 0 rgba(150,101,42,.85),
            inset -3px 0 0 rgba(150,101,42,.85),
            inset 0 -3px 0 rgba(122,80,30,.9),
            inset 0 4px 7px rgba(0,0,0,.34);
        }

        /* Luống đã cày: mặt luống sáng ở trên, vệt cày ngang, sườn tối ở dưới. */
        .farm-luong {
          height: calc(var(--px) * 13);
          background-image:
            repeating-linear-gradient(0deg,
              rgba(0,0,0,.10) 0 var(--px),
              rgba(255,255,255,.04) var(--px) calc(var(--px) * 3)),
            linear-gradient(180deg,
              #b98d2c 0 var(--px),
              #a67b21 var(--px) calc(var(--px) * 3),
              #8f5e0a calc(var(--px) * 3) 62%,
              #6b4706 62% 100%);
          box-shadow: inset 0 calc(var(--px) * -1) 0 rgba(0,0,0,.3);
        }

        /* Đất hoang chưa cày: cùng tông nhưng phẳng, xỉn và tối hơn. */
        .farm-hoang {
          height: calc(var(--px) * 9);
          background-image: linear-gradient(180deg, #6f4d16 0 var(--px), #55380a var(--px) 100%);
          opacity: .75;
        }

        /* Nền thửa đất giữa các luống. */
        .farm-ruong {
          background-color: #6b4708;
          background-image:
            repeating-linear-gradient(0deg,
              rgba(0,0,0,.14) 0 var(--px),
              rgba(0,0,0,0) var(--px) calc(var(--px) * 5)),
            repeating-linear-gradient(90deg,
              rgba(255,255,255,.045) 0 var(--px),
              rgba(0,0,0,0) var(--px) calc(var(--px) * 4)),
            linear-gradient(180deg, #7d520b 0%, #4f3305 100%);
        }

        .farm-sang {
          background: radial-gradient(circle,
            rgba(255,238,150,.85) 0%, rgba(255,210,60,.35) 45%, rgba(255,210,60,0) 70%);
          animation: farm-tho 1.8s ease-in-out infinite;
        }
        @keyframes farm-tho {
          0%, 100% { opacity: .45; transform: translateX(-50%) scale(.88); }
          50%      { opacity: 1;   transform: translateX(-50%) scale(1.06); }
        }

        /* Nhún theo bội số nguyên của pixel, không thì cây rung mờ nét. */
        .farm-nhun { animation: farm-nhun 1.4s steps(1, end) infinite; }
        @keyframes farm-nhun {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(calc(var(--px) * -1)); }
        }

        .farm-may { animation: farm-may linear infinite; }
        @keyframes farm-may {
          from { transform: translateX(-140px); }
          to   { transform: translateX(calc(100% + 100vw)); }
        }

        .farm-sao { animation: farm-sao 3.2s ease-in-out infinite; }
        @keyframes farm-sao {
          0%, 100% { opacity: .25; }
          50%      { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .farm-may, .farm-sao, .farm-sang, .farm-nhun { animation: none !important; }
        }
      `}</style>

      {/* ── Lớp 1: trời ── */}
      <div
        className="relative h-24 overflow-hidden sm:h-32"
        style={{ background: `linear-gradient(180deg, ${troiTren} 0%, ${troiDuoi} 100%)` }}
      >
        {banNgay ? (
          <span
            aria-hidden
            className="absolute right-6 top-5 block size-14 rounded-full"
            style={{
              background:
                'radial-gradient(circle, #fff8cc 0 32%, #ffdc55 33% 52%, rgba(255,220,85,.35) 53% 72%, rgba(255,220,85,0) 73%)',
            }}
          />
        ) : (
          <>
            <span
              aria-hidden
              className="absolute right-8 top-5 block size-10 rounded-full"
              style={{
                background: 'radial-gradient(circle at 62% 38%, #f6f8ff 0 46%, rgba(246,248,255,.18) 47% 70%, rgba(246,248,255,0) 71%)',
              }}
            />
            {SAO.map(([x, y, tre]) => (
              <span
                key={`${x}-${y}`}
                aria-hidden
                className="farm-sao absolute block size-[2px] rounded-full bg-white"
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${tre}s` }}
              />
            ))}
          </>
        )}

        <AnhPixel
          src={ANH_MAY_1}
          className="farm-may pointer-events-none absolute left-0 top-4 opacity-90"
          style={{ width: 34 * PHONG_NEN, animationDuration: '46s' }}
        />
        <AnhPixel
          src={ANH_MAY_2}
          className="farm-may pointer-events-none absolute left-0 top-12 opacity-80"
          style={{ width: 54 * PHONG_NEN, animationDuration: '71s', animationDelay: '-24s' }}
        />
      </div>

      {/* ── Lớp 2: rặng cây và hàng rào ──
          Mấy búi cỏ ở mép dưới tấm ảnh có nền trong suốt, nên tô sẵn màu đất
          phía sau để cỏ mọc ra từ thửa ruộng chứ không lơ lửng trên khoảng
          trắng. */}
      <div
        aria-hidden
        style={{
          height: NEN_DAI_CANH * PHONG_NEN,
          backgroundColor: '#7d520b',
          backgroundImage: `url(${banNgay ? ANH_NEN_NGAY : ANH_NEN_DEM})`,
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center bottom',
          backgroundSize: `${NEN_RONG * PHONG_NEN}px ${NEN_CAO * PHONG_NEN}px`,
          imageRendering: 'pixelated',
        }}
      />

      {/* ── Lớp 3: thửa đất ── */}
      <div className="farm-ruong relative pb-2 pt-1">
        {hang.map((oTrongHang, thuTuHang) => (
          <div key={thuTuHang} className="relative">
            {/*
              Dải luống chạy suốt bề ngang thửa ruộng, vẽ ở cấp hàng và nằm sau
              lưng các ô. Cắt thành từng mẩu theo ô thì mỗi hàng hoá ra bốn tấm
              ván rời có đầu có đuôi; một dải liền mới đọc ra là luống cày.
            */}
            <span
              aria-hidden
              className="farm-luong absolute inset-x-0"
              style={{ bottom: CHAN_O }}
            />
            {/*
              Bề ngang chỗ trồng đo bằng chính bội số pixel: mỗi ô rộng 40 đơn
              vị ảnh, vừa đủ để hai gò đất cạnh nhau gần nhau như luống thật.
              Giãn hết bề ngang thẻ thì bốn gò đứng cách nhau cả gang tay.

              Bọc thêm một lớp "bệ trồng": bốn ô trước đây đứng trần trên nền
              đất nên hai bên thừa ra hai mảng đất trống chẳng để làm gì, mà
              cũng không thấy đâu là ranh giới của khoảnh trồng. Bệ có nẹp gỗ
              ba mặt, trong lòng tối hơn nền — nhìn ra một luống có bờ.
            */}
            <div
              className="farm-be relative mx-auto grid grid-cols-4 gap-x-1.5"
              style={{ width: 'min(100%, calc(var(--px) * 44 * 4))' }}
            >
              {oTrongHang.map((c) =>
                c.o ? (
                  <ODat
                    key={c.soTT}
                    o={c.o}
                    now={now}
                    dangChon={dangChon === c.o.index}
                    onChon={() => onChon(c.o!.index)}
                  />
                ) : (
                  <ODatKhoa
                    key={c.soTT}
                    soTT={c.soTT}
                    gia={c.soTT - 1 === soO ? giaMoO : null}
                    duTien={duTienMoO}
                    dangLam={dangLam}
                    onMua={onMua}
                  />
                ),
              )}
            </div>
          </div>
        ))}

        {/* Ban đêm phủ một lớp xanh lạnh cho thửa đất tối theo bầu trời. */}
        {!banNgay && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: 'rgba(24, 42, 92, .45)' }}
          />
        )}
        </div>
      </div>
    </div>
  );
}
