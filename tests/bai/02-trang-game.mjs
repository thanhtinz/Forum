import { GOC, db, moTrang } from '../tro-giup.mjs';
import { bocChu } from '../../src/lib/chu-dam-const.ts';

/** Trang game bày đủ những thứ người ta vào đây để tìm. */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN', banTai: { some: { heMay: 'JAVA' } } },
    select: {
      id: true, duongDan: true, ten: true, nhaPhatTrien: true, gioiThieu: true, bia: true,
      theLoai: { select: { theLoaiId: true } },
      anhChup: { take: 1, select: { id: true } },
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

  /*
   * Biểu tượng game phải được cắt theo hình SIÊU Ê-LÍP, không phải hình vuông
   * bo góc — xem `.bieu-tuong` trong `globals.css`. Mặt nạ ấy là một dòng CSS
   * dài và trông như rác, nên nó đúng là thứ có ngày bị ai đó dọn đi cho gọn.
   */
  const matNa = await p.locator('.bieu-tuong').first()
    .evaluate((o) => getComputedStyle(o).maskImage || getComputedStyle(o).webkitMaskImage);
  kiem('biểu tượng game cắt theo hình squircle',
    !!matNa && matNa !== 'none' && matNa.includes('svg'), String(matNa).slice(0, 60));

  /*
   * ĐÚNG MỘT nút tải tô đặc trên cả trang.
   *
   * Game một hệ máy thì nút tô đặc là nút ở đầu trang (bấm là tải ngay); game
   * nhiều hệ thì nó nằm trong khung tải, sau dãy chip chọn hệ. Hai nút xanh
   * đặc cùng lúc là mời bấm nhầm — đếm ở đây để chuyện ấy không lặng lẽ quay
   * lại lúc ai đó sửa một trong hai chỗ.
   */
  const soNutDam = await p.locator('a.nut-cai-dam').count();
  kiem('có đúng một nút tải tô đặc', soNutDam === 1, `đếm được ${soNutDam}`);
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
   * DẢI BÌA CHỈ DỰNG TỪ ẢNH THẬT.
   *
   * Có ảnh bìa, hoặc ít nhất một ảnh chụp, thì đầu trang là một dải hình trải
   * hết bề ngang, hai nút lùi và chia sẻ nổi đè lên — đúng trang ứng dụng của
   * App Store. KHÔNG có ảnh nào thì tuyệt đối không dựng dải màu bịa ra cho có:
   * trang ứng dụng trên máy Mac mở thẳng bằng hai cái nút ấy rồi tới biểu
   * tượng, và một dải màu suy từ tên game chỉ chiếm một tầm mắt để nói đúng
   * một điều — game này chưa có ảnh.
   */
  /*
   * ẢNH XEM TRƯỚC KHI DÁN LIÊN KẾT.
   *
   * Dán liên kết game vào Zalo hay Messenger là cách người ta gửi game cho
   * nhau ở đây. Game có ảnh riêng thì ô xem trước phải lấy ảnh ẤY, không mượn
   * tấm chung của cửa hàng — mười liên kết trông y hệt nhau thì tấm ảnh không
   * nói được game nào cả.
   */
  const ogAnh = await p.locator('meta[property="og:image"]').first()
    .getAttribute('content').catch(() => null);
  kiem('trang game có ảnh xem trước để dán liên kết', !!ogAnh, String(ogAnh));
  if (game.bia) {
    kiem('và ảnh ấy là ảnh bìa của chính game này',
      (ogAnh ?? '').includes(game.bia), String(ogAnh));
  }

  const coAnhThat = !!game.bia || game.anhChup.length > 0;
  const daiBia = p.locator('[data-viec="bia"]');
  if (coAnhThat) {
    kiem('game có ảnh thì đầu trang là một dải bìa', (await daiBia.count()) === 1);
    kiem('dải bìa ấy dựng từ ảnh, không phải một mảng màu',
      (await daiBia.locator('img').count()) === 1);
    kiem('hai nút lùi và chia sẻ nổi trên dải bìa',
      (await daiBia.locator('button, a').count()) >= 2);
  } else {
    kiem('game chưa có ảnh nào thì KHÔNG dựng dải bìa bịa ra',
      (await daiBia.count()) === 0);
    kiem('nhưng nút lùi và nút chia sẻ vẫn ở góc trên',
      (await p.locator('main button[aria-label*="ùi"], main a[aria-label*="ùi"]').count()) > 0
      || (await p.locator('main button').first().isVisible()));
  }

  /*
   * THỨ TỰ MỤC THEO ĐÚNG TRANG ỨNG DỤNG CỦA APP STORE.
   *
   * Giới thiệu → Tải về → Đánh giá → Thông tin. Bảng thông tin đứng SAU phần
   * đánh giá là chỗ dễ bị xếp ngược nhất, vì viết mã thì ai cũng muốn để hai
   * bảng dữ liệu cạnh nhau; còn người đọc thì muốn biết người khác nói gì
   * trước khi tra mấy dòng khô khan.
   */
  const dauDe = await p.locator('main h2').evaluateAll((els) =>
    els.map((e) => e.textContent?.trim() ?? ''));
  const viTri = (ten) => dauDe.indexOf(ten);
  const truoc = (a, b) => viTri(a) === -1 || viTri(b) === -1 || viTri(a) < viTri(b);
  kiem('mục xếp đúng thứ tự App Store',
    truoc('Giới thiệu', 'Tải về') && truoc('Tải về', 'Đánh giá')
    && truoc('Đánh giá', 'Thông tin'),
    JSON.stringify(dauDe));

  /*
   * MỘT CỘT, KHÔNG PHẢI HAI.
   *
   * Bản cũ chia máy bàn làm cột trái 300px dính lại và cột phải cuộn, nên hàng
   * số liệu bị bóp đứt giữa chữ. Đo bề ngang thật của hàng ấy so với bề ngang
   * phần nội dung: bóp lại lần nữa là con số này tụt ngay.
   */
  const rong = await p.locator('main').evaluate((m) => {
    const hang = m.querySelector('dl');
    return hang ? [hang.getBoundingClientRect().width, m.getBoundingClientRect().width] : null;
  });
  kiem('hàng số liệu trải hết bề ngang nội dung',
    !!rong && rong[0] > rong[1] * 0.8, JSON.stringify(rong));

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

  /*
   * Phần đầu (tên game + nút tải) phải ĐỨNG YÊN khi đổi tab — nó nằm ở khung
   * chung, nên người đọc không mất chỗ tải khi sang xem thảo luận.
   *
   * Đo NÚT ĐẦU TRANG, không đo khung tải: từ đợt dựng lại trang theo App
   * Store, khung chọn hệ máy và phiên bản nằm trong tab Thông tin chứ không
   * còn ở khung chung — một bảng điều khiển chắn giữa người đọc và chủ đề họ
   * vừa bấm vào thì chẳng giúp được ai. Thứ phải theo suốt mọi tab là cái nút
   * trả lời câu "tải ở đâu", và đó chính là nút này.
   */
  kiem('đổi tab thì tên game vẫn còn', (await p.content()).includes(game.ten));
  kiem('đổi tab thì nút tải đầu trang vẫn còn',
    (await p.locator('a[data-viec="tai-dau"]').count()) > 0);
  // Còn khung CHỌN bản thì ở lại tab Thông tin, không chen vào diễn đàn.
  kiem('tab diễn đàn không mang theo khung chọn bản',
    (await p.locator('#tai').count()) === 0);

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
