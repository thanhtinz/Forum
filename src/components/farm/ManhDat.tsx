'use client';

import type { ODat as ODatDL } from '@/lib/farm';
import {
  ANH_BXH, ANH_CAY_KHE, ANH_CAY_KHE_CHIN, ANH_CUA_HANG,
  ANH_MAY_1, ANH_MAY_2, ANH_NEN_DEM, ANH_NEN_NGAY, ANH_NHA_KHO,
  NEN_CAO, NEN_DAI_CANH, NEN_RONG, O_DAT_TOI_DA, O_MOI_TRANG, TROI_DEM, TROI_NGAY,
  changCua, doToiTroi,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';
import { BienBangDon } from './VePixel';
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
 * Pha hai màu hex theo tỉ lệ `t` (0 là màu đầu, 1 là màu sau).
 *
 * Pha ở JS chứ không dùng `color-mix()` của CSS: giá trị `t` đổi mỗi giây
 * theo đồng hồ, mà đã phải dựng lại kiểu nội tuyến thì tính luôn ra mã màu
 * gọn hơn là dựng một chuỗi `color-mix` dài ngoằng.
 */
function pha(a: string, b: string, t: number): string {
  const doc = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = doc(a);
  const [br, bg, bb] = doc(b);
  const g = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${g(ar, br)}, ${g(ag, bg)}, ${g(ab, bb)})`;
}

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
  dangChon: number | null;
  onChon: (index: number) => void;
  /** Giá mở ô tiếp theo; `null` là đã kịch trần. */
  giaMoO: number | null;
  duTienMoO: boolean;
  dangLam: boolean;
  onMua: () => void;
  /** Trang ruộng đang xem, đếm từ 0. */
  trang: number;
  onTrang: (trang: number) => void;
  onMoCuaHang: () => void;
  onMoNhaKho: () => void;
  onMoBxh: () => void;
  onMoBangDon: () => void;
  /** Cây khế đã ra quả chưa, và bấm vào thì hái. */
  kheSanSang: boolean;
  onHaiKhe: () => void;
}

export function ManhDat({
  oDat, now, dangChon, onChon, giaMoO, duTienMoO, dangLam, onMua,
  trang, onTrang, onMoCuaHang, onMoNhaKho, onMoBxh, onMoBangDon,
  kheSanSang, onHaiKhe,
}: Props) {
  /*
   * Trời tính từ ĐỒNG HỒ ĐANG CHẠY, không phải từ một cái cờ máy chủ gửi
   * xuống lúc dựng trang: có cờ thì mở trang lúc 17h55 rồi ngồi đó, tới 18h30
   * ngoài trời tối om mà trong game vẫn nắng chang chang cho tới khi tải lại.
   *
   * `doToiTroi` trả về số thực 0..1 nên mọi lớp đều pha được theo nó, và
   * cảnh chuyển dần trong hai tiếng chứ không giật một nhát ở đúng mốc giờ.
   */
  const toi = doToiTroi(new Date(now));
  const banNgay = toi < 0.5;
  const troiTren = pha(TROI_NGAY[0], TROI_DEM[0], toi);
  const troiDuoi = pha(TROI_NGAY[1], TROI_DEM[1], toi);

  /*
   * Bày thêm bao nhiêu ô chưa mở: chỉ đủ cho ĐẦY HÀNG đang dở rồi thêm một
   * hàng nữa, tối đa tới trần. Bày sẵn cả tám ô hoang thì mảnh đất trông như
   * bỏ hoang, mà không bày ô nào thì người chơi chẳng thấy đường mở rộng.
   */
  const soO = oDat.length;
  const soHienRa = Math.min(O_DAT_TOI_DA, Math.ceil((soO + 1) / 4) * 4);

  /*
   * Chia trang trên SỐ Ô ĐANG BÀY, không phải trên trần 40: người mới chơi có
   * bốn ô thì vẫn đúng một trang, không phải bốn trang rỗng đứng chờ.
   */
  const soTrang = Math.max(1, Math.ceil(soHienRa / O_MOI_TRANG));
  const trangAnToan = Math.min(Math.max(0, trang), soTrang - 1);
  const dau = trangAnToan * O_MOI_TRANG;
  const cuoi = Math.min(soHienRa, dau + O_MOI_TRANG);

  // Trang nào có ô đã chín, và trang nào chứa ô mua được ngay — để đánh dấu
  // lên nút chuyển trang.
  const chinTheoTrang = Array.from({ length: soTrang }, (_, t) =>
    oDat
      .slice(t * O_MOI_TRANG, (t + 1) * O_MOI_TRANG)
      .some((o) => changCua(o.plantedAt, o.readyAt, now) === 'chin'));
  const moDuocTrang = giaMoO != null ? Math.floor(soO / O_MOI_TRANG) : null;

  // Xếp thành từng hàng bốn ô: dải luống vẽ theo hàng nên phải biết hàng nào
  // gồm những ô nào, chứ một lưới phẳng thì không có chỗ móc dải luống vào.
  const hang: { soTT: number; o: ODatDL | null }[][] = [];
  for (let i = dau; i < cuoi; i += 4) {
    hang.push(
      Array.from({ length: Math.min(4, cuoi - i) }, (_, j) => ({
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

        /*
         * Hai bệ ghép đôi trên máy tính phải đọc ra MỘT bệ tám ô, không phải
         * hai bệ kê sát nhau: bệ trái bỏ nẹp phải, bệ phải bỏ nẹp trái, và
         * hai góc ở chỗ giáp nhau vuông lại.
         *
         * Lề trong chỗ giáp cũng phải rút một nửa (6px → 3px mỗi bên): để
         * nguyên thì khe giữa ô thứ tư và ô thứ năm rộng gấp đôi mọi khe khác,
         * nhìn ra ngay chỗ nối.
         */
        @media (min-width: 640px) {
          .farm-cap > :nth-child(odd) .farm-be {
            padding-right: 3px;
            border-radius: 4px 0 0 7px;
            box-shadow:
              inset 3px 0 0 rgba(150,101,42,.85),
              inset 0 -3px 0 rgba(122,80,30,.9),
              inset 0 4px 7px rgba(0,0,0,.34);
          }
          .farm-cap > :nth-child(even) .farm-be {
            padding-left: 3px;
            border-radius: 0 4px 7px 0;
            box-shadow:
              inset -3px 0 0 rgba(150,101,42,.85),
              inset 0 -3px 0 rgba(122,80,30,.9),
              inset 0 4px 7px rgba(0,0,0,.34);
          }
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

        /* Ô của mình mà chưa xới: đất còn chai, khô và bạc. Khác hẳn
           .farm-hoang bên dưới — cái đó là đất CHƯA MUA, không phải đất chưa
           xới. (Không dùng dấu huyền quanh tên lớp ở đây: cả khối CSS này nằm
           trong một chuỗi mẫu, một dấu huyền là đứt chuỗi.) */
        .farm-chai { filter: saturate(.45) brightness(.82); }

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
        {/*
          Mặt trời, mặt trăng và các vì sao đều dựng SẴN cả ba, chỉ mờ tỏ theo
          `toi`. Dựng có điều kiện thì tới mốc giờ mặt trời biến mất và mặt
          trăng hiện ra trong đúng một khung hình — mà lúc chạng vạng thì
          ngoài đời cả hai cùng ở trên trời.

          Mặt trời lặn xuống còn mặt trăng mọc lên: chỉ mờ dần tại chỗ thì ra
          hai cái đèn ai đó bật tắt, có nhích theo chiều dọc mới ra chuyển
          cảnh.
        */}
        <span
          aria-hidden
          className="absolute right-6 block size-14 rounded-full"
          style={{
            top: `${20 + toi * 46}px`,
            opacity: Math.max(0, 1 - toi * 1.6),
            background:
              'radial-gradient(circle, #fff8cc 0 32%, #ffdc55 33% 52%, rgba(255,220,85,.35) 53% 72%, rgba(255,220,85,0) 73%)',
          }}
        />
        <span
          aria-hidden
          className="absolute right-8 block size-10 rounded-full"
          style={{
            top: `${66 - toi * 46}px`,
            opacity: Math.max(0, toi * 1.6 - 0.6),
            background: 'radial-gradient(circle at 62% 38%, #f6f8ff 0 46%, rgba(246,248,255,.18) 47% 70%, rgba(246,248,255,0) 71%)',
          }}
        />
        {SAO.map(([x, y, tre]) => (
          <span
            key={`${x}-${y}`}
            aria-hidden
            className="farm-sao absolute block size-[2px] rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${tre}s`, opacity: toi }}
          />
        ))}

        {/*
          Ba tầng mây, mỗi tầng một cỡ một tốc độ: đám nhỏ ở xa trôi chậm và
          mờ, đám to ở gần trôi nhanh và rõ. Cùng cỡ cùng tốc độ thì ba đám
          dính thành một dải phẳng, không ra chiều sâu.

          Trễ âm (`animationDelay`) để mỗi đám vào cảnh ở một chỗ khác nhau
          ngay từ giây đầu — không có nó thì mở trang ra trời trống trơn, phải
          đợi cả phút mới thấy đám mây đầu tiên bò vào.

          Mây mờ dần về đêm chứ không tắt hẳn: đêm trăng vẫn nhìn ra mây.
        */}
        <AnhPixel
          src={ANH_MAY_1}
          className="farm-may pointer-events-none absolute left-0 top-3"
          style={{ width: 24 * PHONG_NEN, animationDuration: '96s', animationDelay: '-40s',
            opacity: 0.55 - toi * 0.25 }}
        />
        <AnhPixel
          src={ANH_MAY_2}
          className="farm-may pointer-events-none absolute left-0 top-8"
          style={{ width: 40 * PHONG_NEN, animationDuration: '68s', animationDelay: '-12s',
            opacity: 0.8 - toi * 0.35 }}
        />
        <AnhPixel
          src={ANH_MAY_1}
          className="farm-may pointer-events-none absolute left-0 top-14"
          style={{ width: 60 * PHONG_NEN, animationDuration: '44s', animationDelay: '-30s',
            opacity: 0.95 - toi * 0.4 }}
        />
      </div>

      {/* ── Lớp 2: rặng cây và hàng rào ──
          Mấy búi cỏ ở mép dưới tấm ảnh có nền trong suốt, nên tô sẵn màu đất
          phía sau để cỏ mọc ra từ thửa ruộng chứ không lơ lửng trên khoảng
          trắng. */}
      <div className="relative" style={{ height: NEN_DAI_CANH * PHONG_NEN, backgroundColor: '#7d520b' }}>
        {/* Hai tấm nền chồng lên nhau, tấm đêm mờ tỏ theo `toi` — đổi thẳng
            `backgroundImage` thì rặng cây đang nắng nhảy phắt sang rặng cây
            đêm, mà hai tấm chỉ khác nhau ở màu nên chuyển dần là liền mạch. */}
        {[[ANH_NEN_NGAY, 1], [ANH_NEN_DEM, toi]].map(([anh, mo]) => (
          <span
            key={anh as string}
            aria-hidden
            className="absolute inset-0 block"
            style={{
              opacity: mo as number,
              backgroundImage: `url(${anh})`,
              backgroundRepeat: 'repeat-x',
              backgroundPosition: 'center bottom',
              backgroundSize: `${NEN_RONG * PHONG_NEN}px ${NEN_CAO * PHONG_NEN}px`,
              imageRendering: 'pixelated',
            }}
          />
        ))}
        {/*
          Cửa hàng và nhà kho dựng ngay trong cảnh, không phải hai thẻ rời ở
          cuối trang: đi mua hạt thì bước tới cửa hàng, đi cất nông sản thì
          bước tới nhà kho — chỗ nào cũng đoán được mà chẳng cần chỉ.

          Bốn thứ đứng chung một hàng nên cái nào cũng phải nhỏ lại: để cỡ
          lúc chỉ có một căn thì ở khổ điện thoại chúng chiếm hết bề ngang,
          chẳng còn thấy rặng cây đâu. Bảng xếp hạng nhỏ nhất vì nó là tấm
          biển, không phải căn nhà.

          Đứng bên TRÁI vì mặt trời và mặt trăng đều nằm ở góc phải bầu trời.
          Nhà cao hơn rặng cây nên nhô lên nền trời — đó là chủ ý, mái nhà cắt
          ngang đường chân trời mới ra một căn nhà đứng trước cảnh, chứ không
          phải một hình dán bẹt vào rặng cây.
        */}
        <div className="absolute inset-x-1 bottom-0 flex items-end justify-between gap-1 sm:inset-x-6 sm:gap-3">
          <div className="flex items-end gap-1 sm:gap-3">
            <button
              type="button"
              onClick={onMoCuaHang}
              title="Cửa hàng hạt giống"
              aria-label="Mở cửa hàng hạt giống"
              className="origin-bottom transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              <AnhPixel src={ANH_CUA_HANG} className="block w-[62px] sm:w-[124px]" />
            </button>
            <button
              type="button"
              onClick={onMoNhaKho}
              title="Nhà kho"
              aria-label="Mở nhà kho"
              className="origin-bottom transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              <AnhPixel src={ANH_NHA_KHO} className="block w-[52px] sm:w-[104px]" />
            </button>
            <button
              type="button"
              onClick={onMoBangDon}
              title="Bảng đơn hàng"
              aria-label="Mở bảng đơn hàng"
              className="origin-bottom transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              <BienBangDon className="block w-[44px] sm:w-[88px]" />
            </button>
            <button
              type="button"
              onClick={onMoBxh}
              title="Bảng xếp hạng nông trại"
              aria-label="Mở bảng xếp hạng nông trại"
              className="origin-bottom transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              {/* Tấm biển của chính bản gốc, đã có sẵn chữ "BẢNG XẾP HẠNG"
                  tiếng Việt vẽ trong ảnh — không cần tự vẽ nữa. */}
              <AnhPixel src={ANH_BXH} className="block w-[44px] sm:w-[88px]" />
            </button>
          </div>

          {/*
            Cây khế đứng tách hẳn sang mép PHẢI, không xếp cùng dãy nhà: nó
            không phải công trình để bấm vào xem gì cả mà là một cái cây có
            quả để hái, và cứ vài giờ mới hái được một lần. Đứng riêng thì lúc
            nó chín, người chơi thấy ngay có thứ khác lạ ở góc vườn.
          */}
          <button
            type="button"
            onClick={onHaiKhe}
            disabled={!kheSanSang}
            title={kheSanSang ? 'Cây khế đã ra quả — hái vào kho' : 'Cây khế chưa ra quả'}
            aria-label={kheSanSang ? 'Hái quả khế vào kho' : 'Cây khế chưa ra quả'}
            className={cn(
              'origin-bottom transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200',
              kheSanSang ? 'farm-nhun cursor-pointer hover:scale-105' : 'cursor-not-allowed',
            )}
          >
            <AnhPixel
              src={kheSanSang ? ANH_CAY_KHE_CHIN : ANH_CAY_KHE}
              className="block w-[58px] sm:w-[116px]"
            />
          </button>
        </div>

        {/*
          Lớp phủ đêm trùm CẢ rặng cây lẫn dãy nhà, không chỉ thửa đất.
          Thiếu nó thì lúc chín giờ tối bầu trời đã đen kịt mà cửa hàng, nhà
          kho và hai tấm biển vẫn sáng trưng như đang giữa trưa — nhìn ra mấy
          hình dán lên nền chứ không ra một cảnh có ánh sáng chung.
        */}
        {toi > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: `rgba(24, 42, 92, ${(toi * 0.45).toFixed(3)})` }}
          />
        )}
      </div>

      {/* ── Lớp 3: thửa đất ── */}
      <div className="farm-ruong relative pb-2 pt-1">
        {/*
          Điện thoại xếp hai hàng bốn ô chồng lên nhau; máy tính ghép ĐÔI hàng
          nằm cạnh nhau thành một dải tám ô.

          Ghép ở cấp hàng chứ không đổi số cột của bệ, vì dải luống vẽ theo
          hàng: một lưới tám cột thì ở khổ hẹp nó tự xuống dòng thành hai hàng
          nhìn thấy, mà chỉ có MỘT dải luống vẽ cho cả khối — hàng trên mất
          luống. Còn ghép theo cặp thì mỗi hàng vẫn giữ dải luống của nó, hai
          dải nằm sát nhau nối thành một vệt chạy suốt bề ngang.

          Hàng lẻ (trang cuối chỉ còn một hàng) thì không ghép, để nguyên một
          cột — không thì nó co lại còn nửa thửa ruộng, bỏ trống hẳn bên phải.
        */}
        <div className={cn('grid', hang.length > 1 && 'farm-cap sm:grid-cols-2')}>
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
        </div>

        {/* Ban đêm phủ một lớp xanh lạnh cho thửa đất tối theo bầu trời. */}
        {toi > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: `rgba(24, 42, 92, ${(toi * 0.45).toFixed(3)})` }}
          />
        )}
        </div>
      </div>

      {soTrang > 1 && (
        <ThanhTrang
          soTrang={soTrang} trang={trangAnToan} onTrang={onTrang}
          chinTheoTrang={chinTheoTrang} moDuocTrang={moDuocTrang}
        />
      )}
    </div>
  );
}

/**
 * Chuyển trang ruộng.
 *
 * Hai dấu chấm trên số trang là phần đáng kể nhất ở đây, không phải trang trí:
 * chia trang xong thì ô chín ở trang khác BIẾN MẤT khỏi mắt người chơi, mà cây
 * chín để lâu thì phí cả vụ. Chấm xanh báo trang ấy có ô đã chín, chấm vàng
 * báo trang ấy có ô mua được ngay — hai thứ duy nhất đáng lật trang để xem.
 */
function ThanhTrang({
  soTrang, trang, onTrang, chinTheoTrang, moDuocTrang,
}: {
  soTrang: number;
  trang: number;
  onTrang: (t: number) => void;
  chinTheoTrang: boolean[];
  moDuocTrang: number | null;
}) {
  return (
    <nav aria-label="Trang ruộng" className="mt-1.5 flex items-center justify-center gap-1">
      <button
        type="button" disabled={trang === 0} onClick={() => onTrang(trang - 1)}
        aria-label="Lùi một trang ruộng"
        className="grid size-7 shrink-0 place-items-center rounded-md bg-black/25 text-sm font-black text-amber-50 disabled:opacity-30"
      >‹</button>

      {Array.from({ length: soTrang }, (_, i) => (
        <button
          key={i} type="button" onClick={() => onTrang(i)}
          aria-label={
            `Trang ruộng ${i + 1}`
            + (chinTheoTrang[i] ? ', có ô đã chín' : '')
            + (moDuocTrang === i ? ', còn đất mở được' : '')
          }
          aria-current={i === trang ? 'true' : undefined}
          className={cn(
            'relative grid size-7 shrink-0 place-items-center rounded-md text-xs font-black',
            i === trang
              ? 'bg-amber-300 text-amber-950'
              : 'bg-black/25 text-amber-50 hover:bg-black/40',
          )}
        >
          {i + 1}
          {chinTheoTrang[i] && (
            <span aria-hidden
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 ring-1 ring-emerald-900/50" />
          )}
          {!chinTheoTrang[i] && moDuocTrang === i && (
            <span aria-hidden
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-1 ring-amber-900/50" />
          )}
        </button>
      ))}

      <button
        type="button" disabled={trang === soTrang - 1} onClick={() => onTrang(trang + 1)}
        aria-label="Tới một trang ruộng"
        className="grid size-7 shrink-0 place-items-center rounded-md bg-black/25 text-sm font-black text-amber-50 disabled:opacity-30"
      >›</button>
    </nav>
  );
}
