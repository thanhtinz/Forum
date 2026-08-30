/**
 * Vẽ tranh pixel bằng SVG từ một BẢN ĐỒ KÝ TỰ.
 *
 * Bộ ảnh nông trại cũ không có tấm biển nào hợp: `farm.png` là cổng trại ghi
 * chữ "FARM" tiếng Anh, mượn vào thì vừa sai nghĩa vừa lạc giọng cả trang.
 * Nên mấy tấm biển ở đây tự vẽ.
 *
 * Vẽ bằng bản đồ ký tự chứ không phải một mớ thẻ `<rect>` chép tay: nhìn vào
 * mã là thấy luôn hình, sửa một điểm ảnh là sửa một chữ cái. Cách này cũng
 * giữ đúng nết pixel — `shapeRendering: crispEdges` cộng lưới toạ độ nguyên
 * thì phóng to bao nhiêu cũng không nhoè, y như `image-rendering: pixelated`
 * của mấy tấm ảnh gốc.
 *
 * Các ô liền nhau cùng màu gộp thành MỘT hình chữ nhật: một tấm 20×16 mà vẽ
 * từng ô là 320 thẻ, gộp lại còn chưa tới 40.
 */
export function VePixel({ hinh, mau, className, title }: {
  /** Mỗi chuỗi là một hàng; dấu chấm là chỗ trong suốt. */
  hinh: readonly string[];
  /** Ký tự → mã màu. */
  mau: Record<string, string>;
  className?: string;
  title?: string;
}) {
  const cao = hinh.length;
  const rong = hinh[0]?.length ?? 0;

  const o: React.ReactElement[] = [];
  for (let y = 0; y < cao; y++) {
    const hang = hinh[y];
    let x = 0;
    while (x < rong) {
      const c = hang[x];
      if (c === '.' || !mau[c]) { x++; continue; }
      let d = x + 1;
      while (d < rong && hang[d] === c) d++;
      o.push(<rect key={`${x}-${y}`} x={x} y={y} width={d - x} height={1} fill={mau[c]} />);
      x = d;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${rong} ${cao}`}
      className={className}
      style={{ shapeRendering: 'crispEdges' }}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {o}
    </svg>
  );
}

/** Gỗ, cỏ và ba màu bục — dùng chung cho mấy tấm biển tự vẽ. */
const MAU_BIEN = {
  k: '#4a2f0f', // viền gỗ
  s: '#a9702f', // mặt gỗ bắt sáng
  g: '#8a5620', // mặt gỗ
  t: '#6d4116', // chân cột
  c: '#4c9a2a', // bụi cỏ dưới chân
  b: '#2f1d0a', // mặt bảng tối
  d: '#f5efe0', // giấy trắng ngà
  n: '#6b4706', // nét chữ trên giấy
  w: '#fff3b0', // ngôi sao
  1: '#ffcf3d', // bục vàng
  2: '#dfe4ea', // bục bạc
  3: '#cd7f32', // bục đồng
} as const;

/**
 * Biển bảng xếp hạng: một tấm gỗ trên hai cột, vẽ bục ba bậc và ngôi sao.
 *
 * Vẽ bục chứ không viết chữ: chữ ở cỡ 20 điểm ảnh thì thành mấy vệt xám, mà
 * cái bục ba bậc thì ai nhìn cũng đọc ra "xếp hạng" — kể cả người không đọc
 * được tiếng Việt.
 *
 * Mặt bảng phải TỐI. Bản đầu để mặt gỗ nâu như khung, thế là bục đồng lẫn
 * hẳn vào nền và ba bậc dính thành một vệt vàng — chụp ảnh ra mới thấy.
 *
 * Và phải BÈ NGANG. Bản thứ hai gần vuông, đứng cạnh cửa hàng với nhà kho thì
 * đọc ra cái lều thứ ba chứ không ra tấm biển. Bề ngang 24 điểm ảnh nên bày ở
 * 48px và 96px — vẫn là bội số nguyên, không nhoè.
 */
const HINH_XEP_HANG = [
  '........................',
  '.kkkkkkkkkkkkkkkkkkkkkk.',
  '.kssssssssssssssssssssk.',
  '.kbbbbbbbbbbbbbbbbbbbbk.',
  '.kbbbbbbbb1111bbbbbbbbk.',
  '.kbbbbbbbb1111bbbbbbbbk.',
  '.kbbbbbbbb1111bbbbbbbbk.',
  '.kbbbb222b1111bbbbbbbbk.',
  '.kbbbb222b1111b333bbbbk.',
  '.kbbbb222b1111b333bbbbk.',
  '.kkkkkkkkkkkkkkkkkkkkkk.',
  '.....tt..........tt.....',
  '.....tt..........tt.....',
  '....cccc........cccc....',
] as const;

export function BienXepHang({ className }: { className?: string }) {
  return <VePixel hinh={HINH_XEP_HANG} mau={MAU_BIEN} className={className} />;
}

/**
 * Bảng ghi chú của khách: tấm gỗ đóng đinh bốn góc, trên ghim một tờ giấy có
 * mấy dòng chữ nguệch ngoạc — đúng cái bảng đơn hàng treo ở đầu trại.
 */
const HINH_BANG_DON = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kssssssssssssk.',
  '.kg..........gk.',
  '.kg.dddddddd.gk.',
  '.kg.dnnnnndd.gk.',
  '.kg.dddddddd.gk.',
  '.kg.dnnnnnnd.gk.',
  '.kg.dddddddd.gk.',
  '.kg.dnnnnddd.gk.',
  '.kg.dddddddd.gk.',
  '.kg..........gk.',
  '.kkkkkkkkkkkkkk.',
  '....tt....tt....',
  '...cccc..cccc...',
  '................',
] as const;

export function BienBangDon({ className }: { className?: string }) {
  return <VePixel hinh={HINH_BANG_DON} mau={MAU_BIEN} className={className} />;
}
