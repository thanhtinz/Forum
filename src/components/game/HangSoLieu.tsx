import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { Ke } from '@/components/game/Ke';
import { SaoNam } from '@/components/game/SaoNam';
import { gonDungLuong, gonSo } from '@/lib/tien-ich';
import { MO_TA_TUOI, napDoTuoi } from '@/lib/do-tuoi-const';

export interface OSoLieu {
  ma: string;
  /** Nhãn nhỏ CHỮ HOA ở trên. */
  nhan: string;
  /** Giá trị to ở giữa. Bỏ trống khi ô dùng `hinh` thay cho chữ. */
  chinh?: string;
  hinh?: React.ReactNode;
  /** Chú thích nhỏ ở dưới. */
  duoi?: React.ReactNode;
  /** Bấm vào đi đâu. Bỏ trống thì ô chỉ để đọc. */
  dich?: string;
}

/*
 * HÀNG SỐ LIỆU DƯỚI TÊN GAME — dáng App Store.
 *
 * Ba tầng, và thứ tự ấy có lý: NHÃN nhỏ chữ hoa trên cùng nói ô này là gì, SỐ
 * to ở giữa là thứ mắt bắt được khi lướt, CHÚ THÍCH nhỏ dưới cùng nói thêm cho
 * ai dừng lại đọc. Bản trước chỉ có hai tầng (số rồi nhãn), nên mỗi ô phải tự
 * giải thích bằng chính con số — mà "543" thì không tự nói được nó là cái gì.
 *
 * CUỘN NGANG Ở MỌI KHỔ, không xuống dòng và không nén lại. Số ô thay đổi theo
 * từng game: game chưa ai đánh giá thì mất ô điểm, game không rõ năm thì mất ô
 * năm. Nén cho vừa thì game nhiều số liệu trông chật, game ít số liệu trông
 * trống trải; cuộn ngang giữ mọi ô đúng một bề rộng ở mọi game.
 *
 * Từng thử xếp lưới hai cột cho khổ rộng, vì cột trái trang game chỉ khoảng ba
 * trăm điểm ảnh. Nhưng lưới thì mỗi game một hình dáng khác — game bảy ô cao
 * gấp đôi game ba ô — còn một dải cuộn thì game nào cũng đúng một hàng, và ô
 * bị cắt ở mép phải chính là lời mời kéo tiếp.
 *
 * Chuột không quệt ngang được, nên dải này mượn `Ke`: hai nút lật và dải mờ ở
 * mép, hiện đúng lúc còn chỗ để lật.
 *
 * Vạch dọc NGĂN GIỮA các ô chứ không viền quanh từng ô: viền quanh thì mỗi ô
 * thành một cái thẻ, mà đây là một hàng liền mạch chứ không phải bốn cái thẻ.
 */
export function HangSoLieu({ o }: { o: OSoLieu[] }) {
  if (o.length === 0) return null;

  return (
    <Ke the="dl" nhan="số liệu" className="vach vach-duoi -mx-4 mt-4 border-y px-4 py-3 sm:mx-0 sm:px-0">
      {o.map((m, i) => {
        const than = (
          <>
            <dt className="text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-mo">
              {m.nhan}
            </dt>
            <dd className="mt-1.5 flex items-center justify-center gap-1 text-[20px] font-bold leading-none tracking-[-0.02em]">
              {m.chinh}
              {m.hinh}
            </dd>
            {m.duoi && (
              <dd className="mt-1.5 flex items-center justify-center text-[12px] leading-none text-mo">
                {m.duoi}
              </dd>
            )}
          </>
        );

        return (
          <div key={m.ma}
            className={`min-w-[104px] shrink-0 whitespace-nowrap px-4 text-center${
              // Vạch ngăn vẽ bằng viền TRÁI của ô thứ hai trở đi, không bằng
              // `divide-x`: `divide-x` kẻ cả ở ô cuối, và một vạch treo lơ
              // lửng ở mép phải trông như trang bị cắt chứ không như còn nữa.
              i > 0 ? ' border-l border-vien' : ''
            }`}>
            {m.dich
              ? <Link href={m.dich} className="block transition-opacity hover:opacity-70">{than}</Link>
              : than}
          </div>
        );
      })}
    </Ke>
  );
}

/** Ô "nhà phát triển" — hình người thay cho con số, đúng lối App Store. */
export function hinhTacGia() {
  return (
    <span className="grid size-[26px] place-items-center rounded-[7px] bg-nen3 text-mo">
      <UserRound size={17} aria-hidden />
    </span>
  );
}

/** Dựng đủ bộ ô cho một game. Để riêng vì nó là LUẬT, không phải cách vẽ. */
export function dungSoLieu(g: {
  sao: number;
  soLuotDanhGia: number;
  soLuotTai: number;
  dungLuong: number | bigint | null;
  soHieu: string | null;
  hang: { thu: number; theLoai: string; duongDan: string } | null;
  namPhatHanh: number | null;
  ngonNgu: string;
  doTuoi: number;
  tacGia: { ten: string; duongDan: string } | null;
}): OSoLieu[] {
  const o: OSoLieu[] = [];

  // Nhãn mang luôn con số lượt đánh giá, y như "20M RATINGS" của App Store:
  // nhờ vậy ô này nói được hai chuyện mà vẫn chỉ chiếm một ô.
  if (g.soLuotDanhGia > 0) {
    o.push({
      ma: 'sao',
      nhan: `${gonSo(g.soLuotDanhGia)} đánh giá`,
      chinh: g.sao.toFixed(1).replace('.', ','),
      duoi: <SaoNam diem={g.sao} co={12} />,
    });
  }

  /*
   * Ô ĐỘ TUỔI đứng THỨ HAI, ngay sau điểm đánh giá — đúng chỗ App Store xếp nó.
   *
   * Bản đầu tôi xếp nó xuống sau lượt tải và dung lượng, lý luận rằng cửa hàng
   * này phần lớn là game cũ vô hại. Chụp màn hình ra mới thấy hậu quả: dải
   * cuộn ngang chỉ bày ba ô một lúc, nên ô thứ tư nằm ngoài màn hình — tức là
   * với người mua game cho con, con số họ cần nhất là con số duy nhất họ không
   * thấy. Thứ tự trên một dải cuộn không phải chuyện thẩm mỹ.
   */
  o.push({
    ma: 'tuoi',
    nhan: 'Độ tuổi',
    chinh: MO_TA_TUOI[napDoTuoi(g.doTuoi)].nhan,
    duoi: 'trở lên',
  });

  o.push({
    ma: 'tai',
    nhan: 'Lượt tải',
    chinh: gonSo(g.soLuotTai),
    duoi: 'từ trước tới nay',
  });

  if (g.dungLuong != null) {
    o.push({
      ma: 'nang',
      nhan: 'Dung lượng',
      chinh: gonDungLuong(g.dungLuong),
      duoi: g.soHieu ? `bản ${g.soHieu}` : undefined,
    });
  }

  /*
   * Ô "bảng xếp hạng" chỉ dựng khi game THẬT SỰ đứng gần đầu.
   *
   * App Store có ô này vì hạng của họ luôn nằm trong top danh mục. Ở đây, một
   * cửa hàng mười hai game mà game nào cũng khoe "#7" thì con số ấy chẳng khen
   * ai cả — nó chỉ nói cửa hàng có ít hàng.
   */
  if (g.hang && g.hang.thu <= 10) {
    o.push({
      ma: 'hang',
      nhan: 'Xếp hạng',
      chinh: `#${g.hang.thu}`,
      duoi: g.hang.theLoai,
      dich: `/the-loai/${g.hang.duongDan}`,
    });
  }

  if (g.namPhatHanh) {
    o.push({ ma: 'nam', nhan: 'Phát hành', chinh: String(g.namPhatHanh), duoi: 'năm' });
  }

  o.push({
    ma: 'tieng',
    nhan: 'Ngôn ngữ',
    chinh: g.ngonNgu === 'vi' ? 'VI' : g.ngonNgu === 'da-ngon-ngu' ? 'NHIỀU' : 'EN',
    duoi: g.ngonNgu === 'vi' ? 'Tiếng Việt'
      : g.ngonNgu === 'da-ngon-ngu' ? 'Nhiều thứ tiếng' : 'Tiếng Anh',
  });

  if (g.tacGia) {
    o.push({
      ma: 'tac-gia',
      nhan: 'Tác giả',
      hinh: hinhTacGia(),
      // Tên hãng dài thì cắt — ô này rộng cố định, và App Store cũng cắt.
      duoi: g.tacGia.ten.length > 18 ? `${g.tacGia.ten.slice(0, 17)}…` : g.tacGia.ten,
      dich: g.tacGia.duongDan,
    });
  }

  return o;
}
