import { GOC, db, moTrang } from '../tro-giup.mjs';
import { bocChu } from '../../src/lib/chu-dam-const.ts';

/** Trang game bày đủ những thứ người ta vào đây để tìm. */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN', banTai: { some: { heMay: 'JAVA' } } },
    select: {
      id: true, duongDan: true, ten: true, nhaPhatTrien: true, gioiThieu: true,
      theLoai: { select: { theLoaiId: true } },
    },
  });
  if (!game) { kiem('có game mẫu để kiểm', false); return; }

  const p = await moTrang();
  await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
  const html = await p.content();

  kiem('có tên game', html.includes(game.ten));
  kiem('có nhà phát triển', !game.nhaPhatTrien || html.includes(game.nhaPhatTrien));
  /*
   * So với chữ TRẦN, không so với nguyên văn trong CSDL.
   *
   * Phần mô tả nay là Markdown, nên `**mười hai màn**` trong CSDL ra
   * `<strong>mười hai màn</strong>` trên trang — tìm nguyên văn thì không bao
   * giờ thấy, dù trang vẫn hiện đúng.
   */
  kiem('có phần giới thiệu',
    !game.gioiThieu || html.includes(bocChu(game.gioiThieu).slice(0, 30)),
    bocChu(game.gioiThieu ?? '').slice(0, 30));

  /*
   * Hàng số liệu: BA TẦNG mỗi ô — nhãn nhỏ chữ hoa, số to, chú thích nhỏ.
   * Nhãn in hoa bằng CSS chứ không bằng chữ, nên trong DOM nó vẫn là chữ
   * thường; so bằng chữ thường hết để bài kiểm không vỡ khi đổi kiểu chữ.
   */
  const soLieu = (await p.locator('dl').first().textContent() ?? '').toLowerCase();
  for (const nhan of ['đánh giá', 'lượt tải']) {
    kiem(`hàng số liệu có ô “${nhan}”`, soLieu.includes(nhan), soLieu);
  }
  kiem('hàng số liệu nói dung lượng của bản mới nhất',
    /bản \S+/.test(soLieu), soLieu);

  // Ô "Hệ máy" đã bỏ khỏi hàng số liệu: dãy chip chọn hệ ngay bên dưới đã nói
  // đúng điều ấy, lại còn liệt kê ra hết thay vì gộp thành "+4 hệ nữa".
  kiem('hàng số liệu không lặp lại hệ máy',
    !/hệ nữa|hệ máy/.test(soLieu), soLieu);

  // Năm phát hành và ngôn ngữ nay nằm trên hàng số liệu. Bảng "Thông tin" bên
  // dưới đã bỏ hai dòng ấy, nên kiểm cả hai đầu: có ở hàng số liệu, và KHÔNG
  // còn ở bảng — in một con số hai chỗ thì sớm muộn hai chỗ nói khác nhau.
  kiem('hàng số liệu có ô ngôn ngữ', soLieu.includes('ngôn ngữ'), soLieu);
  const bangTin = (await p.locator('dl').last().textContent() ?? '').toLowerCase();
  kiem('bảng thông tin không lặp lại năm và ngôn ngữ',
    !bangTin.includes('năm phát hành') && !bangTin.includes('ngôn ngữ'), bangTin);

  /*
   * HAI LỚP SAO PHẢI CHỒNG KHỚP NHAU.
   *
   * Dãy sao vẽ bằng một lớp sao vàng đè lên một lớp sao xám, rồi cắt lớp vàng
   * theo phần trăm điểm. Lỗi đã xảy ra thật: hàng sao bên trong là một `flex`,
   * mà flex mặc định cho phép CO ITEM lại để vừa chỗ — nên năm ngôi sao vàng
   * bị nén vào phần trăm ấy thay vì bị cắt ở đó. Hai lớp lệch nhau, và trên
   * màn hình nó hiện ra đúng như "sao có màu với sao không màu đè lên nhau".
   *
   * Nên đo BỀ NGANG THẬT của hai hàng: chúng phải bằng nhau. Và bề ngang của ô
   * cắt chia cho bề ngang ấy phải đúng bằng điểm chia năm — cùng một phép đo
   * bắt được cả chuyện lệch lớp lẫn chuyện cắt sai chỗ.
   */
  const doSao = await p.locator('[role="img"][aria-label*="trên 5 sao"]').first().evaluate((o) => ({
    nhan: o.getAttribute('aria-label'),
    xam: o.firstElementChild.getBoundingClientRect().width,
    vang: o.lastElementChild.firstElementChild.getBoundingClientRect().width,
    oCat: o.lastElementChild.getBoundingClientRect().width,
  }));
  kiem('hai lớp sao rộng bằng nhau, không lớp nào bị nén',
    Math.abs(doSao.xam - doSao.vang) < 1, JSON.stringify(doSao));
  kiem('lớp sao vàng cắt đúng theo số điểm',
    Math.abs(doSao.oCat / doSao.xam - parseFloat(doSao.nhan) / 5) < 0.02, JSON.stringify(doSao));

  kiem('có nút tải nổi bật', (await p.locator('a.nut-cai-dam').count()) > 0);
  /*
   * KHÔNG CÒN KỆ "GAME TƯƠNG TỰ" Ở TAB THÔNG TIN.
   *
   * Cuối trang game là chỗ người ta vừa đọc xong mô tả và đánh giá, tức là
   * đang gần bấm tải nhất. Bày ngay đó một kệ mời đi xem game khác là tự kéo
   * người ta ra khỏi việc họ đang làm. Gợi ý game khác đã có ở trang tải —
   * lúc đang đứng chờ mới là lúc rảnh để ngó sang hàng khác.
   */
  kiem('tab thông tin không còn kệ game tương tự',
    !html.includes('Game tương tự'));

  /*
   * DIỄN ĐÀN LÀ MỘT TAB, không phải một khối nhét cuối trang.
   *
   * Tab dựng bằng <Link> sang đường dẫn riêng chứ không phải nút đổi trạng
   * thái, nên phải kiểm đúng ba thứ: có tab, bấm sang được, và địa chỉ đổi
   * theo — có địa chỉ riêng thì mới dán cho người khác và mới lùi lại được.
   */
  const tab = p.locator('nav[aria-label="Phần của trang game"] a');
  const tenTab = await tab.evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ''));
  /*
   * ĐÚNG HAI TAB. Đã có một đợt tách đánh giá ra thành tab thứ ba, và đó là
   * bước lùi: tab Thông tin vốn đã có mục đánh giá ở cuối, nên người dùng gặp
   * đúng một thứ ở hai chỗ và phải đoán hai chỗ ấy khác nhau ở đâu.
   */
  kiem('trang game có đúng hai tab', tenTab.length === 2, JSON.stringify(tenTab));
  kiem('tab đầu là Thông tin', (tenTab[0] ?? '').startsWith('Thông tin'), tenTab[0] ?? '');
  kiem('tab sau là Diễn đàn', (tenTab[1] ?? '').startsWith('Diễn đàn'), tenTab[1] ?? '');

  await tab.nth(1).click();
  await p.waitForURL('**/dien-dan', { timeout: 15_000 }).catch(() => {});
  kiem('bấm tab Diễn đàn thì đổi sang đường dẫn riêng',
    p.url().endsWith('/dien-dan'), p.url());

  // Phần đầu (tên game + nút tải) phải ĐỨNG YÊN khi đổi tab — nó nằm ở khung
  // chung, nên người đọc không mất chỗ tải khi sang xem thảo luận.
  kiem('đổi tab thì tên game vẫn còn', (await p.content()).includes(game.ten));
  kiem('đổi tab thì nút tải vẫn còn', (await p.locator('a.nut-cai-dam').count()) > 0);

  // Game đã gỡ / còn nháp phải trả 404, không được xem lén bằng đường dẫn.
  const nhap = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'NHAP' }, select: { duongDan: true } });
  if (nhap) {
    const r = await p.goto(`${GOC}/game/${nhap.duongDan}`, { waitUntil: 'domcontentloaded' });
    kiem('game nháp trả về 404', r.status() === 404, `trả về ${r.status()}`);
  }

  /*
   * Đường dẫn game bịa ra phải trả ĐÚNG MÃ 404, không phải 200 kèm chữ
   * "không có trang này".
   *
   * Mục này canh một lỗi đã xảy ra thật: đặt `loading.tsx` lên tuyến cha biến
   * trang thành phản hồi phát dần, mà phát dần thì mã 200 bị chốt ngay lúc
   * đẩy phần vỏ ra — trước khi trang chạy tới chỗ gọi `notFound()`. Nhìn bằng
   * mắt thì trang vẫn ghi "không có trang này" nên chẳng ai thấy gì sai; chỉ
   * máy tìm kiếm là lập chỉ mục hàng loạt trang rác. Mã trạng thái là thứ chỉ
   * bài kiểm mới thấy, nên nó phải được canh ở đây.
   */
  const bia = await p.goto(`${GOC}/game/duong-dan-bia-ra-khong-ton-tai`, { waitUntil: 'domcontentloaded' });
  kiem('đường dẫn game không có thật trả về 404', bia.status() === 404, `trả về ${bia.status()}`);
  kiem('trang 404 nói bằng tiếng Việt',
    (await p.locator('text=Không có trang này').count()) > 0);

  await p.close();
}
