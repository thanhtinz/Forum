import { GOC, db, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { hostTacGia, laHostTacGia, moTrenCongTacGia } from '../../src/lib/ten-mien-const.ts';

/**
 * CỔNG NHÀ PHÁT TRIỂN — `developer.<tên miền cửa hàng>`.
 *
 * Cùng một bản dựng phục vụ hai tên miền, và chỗ phân luồng chỉ có đúng ở phần
 * mềm trung gian. Thứ dễ hỏng: một đường dẫn của cửa hàng lọt vào cổng ấy rồi
 * trả ra trang 404 của một cổng không có game nào — người gõ nhầm tên miền thì
 * coi như lạc.
 *
 * Chạy được ở máy vì trình duyệt nào cũng tự trỏ mọi tên `*.localhost` về máy
 * mình, nên `developer.localhost` là tên miền thật với Chromium mà không cần
 * sửa DNS hay tệp hosts nào.
 */
export default async function chay(kiem) {
  /*
   * GỌI TỚI CỬA HÀNG, NHƯNG KHAI HOST CỦA CỔNG.
   *
   * Không gõ thẳng `http://developer.localhost:3100`: Chromium tự trỏ mọi tên
   * `*.localhost` về máy mình, nhưng bộ gọi mạng của Playwright thì đi qua DNS
   * thật và ở máy dựng này không có bản ghi ấy. Khai `Host` là cách gọn nhất
   * để phần mềm trung gian thấy đúng tên miền cần thấy — và đó CHÍNH LÀ thứ
   * nó đọc, nên phép kiểm vẫn đo đúng chỗ cần đo.
   */
  const HOST_CONG = { host: `developer.${new URL(GOC).host}` };

  /* ── Phép nhận biết, đo thẳng trên hàm ─────────────────────────────── */
  kiem('nhận ra cổng nhà phát triển', laHostTacGia('developer.sunnystore.vn'));
  kiem('không nhầm cửa hàng thành cổng ấy', !laHostTacGia('sunnystore.vn'));
  kiem('ghép được tên miền cổng từ tên miền cửa hàng',
    hostTacGia('sunnystore.vn') === 'developer.sunnystore.vn');
  kiem('ghép hai lần vẫn ra một tên miền',
    hostTacGia(hostTacGia('sunnystore.vn')) === 'developer.sunnystore.vn');
  kiem('mấy lối của cổng được mở',
    moTrenCongTacGia('/quan-ly') && moTrenCongTacGia('/quan-ly/game/abc')
    && moTrenCongTacGia('/tac-gia/dang-ky'));
  kiem('lối của cửa hàng thì không',
    !moTrenCongTacGia('/game/bounce-tales') && !moTrenCongTacGia('/tim'));

  const khach = await moTrang();
  let tacGia;
  try {
    /* ── Đường dẫn của cửa hàng gõ vào cổng thì được đưa về cửa hàng ──── */
    const r = await khach.request.get(`${GOC}/game/bounce-tales`,
      { headers: HOST_CONG, maxRedirects: 0 });
    kiem('trang game gõ vào cổng thì bị đưa về cửa hàng',
      r.status() === 307 || r.status() === 308, `mã ${r.status()}`);
    const den = r.headers().location ?? '';
    kiem('và đưa về ĐÚNG đường dẫn ấy, không về trang đầu',
      den.includes('/game/bounce-tales') && !den.includes('developer.'), den);

    /* ── Trang xin làm tác giả mở được ngay trên cổng ─────────────────── */
    const rDon = await khach.request.get(`${GOC}/tac-gia/dang-ky`, { headers: HOST_CONG });
    const chu = await rDon.text();
    kiem('cổng mở được trang xin làm tác giả',
      rDon.status() === 200 && chu.includes('Đăng game của bạn'), `mã ${rDon.status()}`);
    kiem('và mặc vỏ riêng của cổng, không phải vỏ cửa hàng',
      chu.includes('cho nhà phát triển'));
    kiem('vỏ ấy KHÔNG mang thanh tìm game của cửa hàng',
      !chu.includes('name="q"'));

    /* ── Gốc cổng là bảng tác giả ─────────────────────────────────────── */
    const rGoc = await khach.request.get(`${GOC}/`, { headers: HOST_CONG, maxRedirects: 0 });
    kiem('khách chưa đăng nhập vào gốc cổng thì bị đưa đi đăng nhập',
      (rGoc.headers().location ?? '').includes('/dang-nhap'), String(rGoc.headers().location));

    const ai = await db.nguoiDung.findFirst({
      where: { vaiTro: 'QUAN_TRI' }, select: { tenDangNhap: true },
    });
    tacGia = await moTrangDaDangNhap(ai.tenDangNhap, 'admin123');
    /*
     * VIẾT LẠI ĐƯỜNG DẪN, KHÔNG CHUYỂN HƯỚNG: người gõ tên miền cổng thì thanh
     * địa chỉ phải vẫn là tên miền ấy, không nhảy thành `/quan-ly`. Nên ở đây
     * phải ra mã 200 chứ không phải 307 — đúng chỗ phân biệt hai lối ấy.
     */
    const rBang = await tacGia.request.get(`${GOC}/`, { headers: HOST_CONG, maxRedirects: 0 });
    kiem('gốc cổng trả thẳng nội dung, không chuyển hướng',
      rBang.status() === 200, `mã ${rBang.status()}`);
    kiem('và nội dung ấy là bảng tác giả',
      (await rBang.text()).includes('/quan-ly/game'));
  } finally {
    await khach.close();
    if (tacGia) await tacGia.close();
  }
}
