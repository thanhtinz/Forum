import { GOC, moTrang, moTrinhDuyet } from '../tro-giup.mjs';

/**
 * Nền tối phải áp ở CẢ HAI bố cục gốc.
 *
 * Dự án có hai `<html>` riêng — cửa hàng và quản trị — và đoạn mã đặt nền phải
 * có ở cả hai. Đã dính đúng chuyện này: lúc tách ra, đoạn ấy ở lại bên cửa
 * hàng còn khu quản trị không có bản nào, nên người chọn nền tối mở khu quản
 * trị ra bị loá cả mắt. Lỗi ấy không có gì báo — cả hai trang đều chạy, chỉ là
 * một trang không nghe lời cài đặt.
 */
export default async function chay(kiem) {
  const may = await moTrinhDuyet();
  const ctx = await may.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('sunny:nen', 'toi'); } catch { /* bị chặn thì thôi */ }
  });
  const p = await ctx.newPage();

  try {
    // Đăng nhập quản trị để vào được cả hai khu.
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', 'admin@sunnystore.local');
    await p.fill('input[name="matKhau"]', 'admin123');
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !u.pathname.includes('/dang-nhap'), { timeout: 10_000 });

    for (const [ten, dia] of [['cửa hàng', '/'], ['quản trị', '/quan-tri']]) {
      await p.goto(GOC + dia, { waitUntil: 'networkidle' });

      /*
       * KHẲNG ĐỊNH ĐANG ĐỨNG ĐÚNG TRANG trước khi phán xét cái nền.
       *
       * Mục này đã có một lần đỏ mà không dựng lại được: `data-nen` rỗng và
       * nền trắng ở `/quan-tri`, trong khi chạy riêng bài này sáu lượt đều
       * xanh. Nếu lần ấy phiên quản trị hết hiệu lực thì trang đã bị đá về chỗ
       * khác, và cái đỏ kia nói về một trang hoàn toàn khác — nhưng câu báo
       * lỗi không hé ra điều đó, nên chẳng có gì để lần.
       *
       * Ghi kèm địa chỉ thật vào mọi câu báo: lần sau đỏ là biết ngay nó đỏ vì
       * nền, hay vì đang đứng nhầm chỗ.
       */
      const dangO = new URL(p.url()).pathname;
      kiem(`${ten}: vào được đúng trang để soi nền`, dangO === dia, `đang ở ${dangO}`);

      const nen = await p.getAttribute('html', 'data-nen');
      kiem(`${ten} áp nền tối theo cài đặt`, nen === 'toi', `data-nen = ${nen} ở ${dangO}`);

      /*
       * Kiểm MÀU THẬT, không chỉ kiểm thuộc tính.
       *
       * Thuộc tính có mà biến CSS không đổi thì trang vẫn trắng. Đọc màu nền
       * đã tính của `body` rồi xét độ sáng — dưới 60 là sẫm thật.
       */
      const sang = await p.evaluate(() => {
        const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? [];
        const [r, g, b] = m.map(Number);
        return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      });
      kiem(`${ten} có nền thật sự sẫm`, sang < 60, `độ sáng ${sang} ở ${dangO}`);
    }

    /*
     * Thanh bên quản trị luôn sẫm ở CẢ HAI nền.
     *
     * Nó là dấu hiệu để người vừa mở tab mới biết mình đang ở khu nào, mà một
     * dấu hiệu đổi màu theo cài đặt thì không còn là dấu hiệu. Bản trước tô nó
     * bằng `bg-chu`/`text-nen` — hai token ĐẢO NHAU khi sang nền tối, nên bật
     * nền tối lên là cả thanh bên hoá trắng toát.
     */
    const doSangThanhBen = async (trang) => trang.evaluate(() => {
      const a = document.querySelector('aside');
      if (!a) return null;
      const m = getComputedStyle(a).backgroundColor.match(/\d+/g) ?? [];
      const [r, g, b] = m.map(Number);
      return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    });

    await p.goto(`${GOC}/quan-tri`, { waitUntil: 'networkidle' });
    const toi = await doSangThanhBen(p);

    const ctx2 = await may.newContext({ viewport: { width: 1280, height: 900 } });
    const p2 = await ctx2.newPage();
    await p2.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p2.fill('input[name="dinhDanh"]', 'admin@sunnystore.local');
    await p2.fill('input[name="matKhau"]', 'admin123');
    await p2.click('button[type="submit"]');
    await p2.waitForURL((u) => !u.pathname.includes('/dang-nhap'), { timeout: 10_000 });
    await p2.goto(`${GOC}/quan-tri`, { waitUntil: 'networkidle' });
    const sang = await doSangThanhBen(p2);
    await ctx2.close();

    kiem('thanh bên quản trị sẫm ở nền sáng', sang != null && sang < 60, `độ sáng ${sang}`);
    kiem('thanh bên quản trị sẫm ở nền tối', toi != null && toi < 60, `độ sáng ${toi}`);
    kiem('thanh bên quản trị giữ NGUYÊN màu ở cả hai nền',
      toi != null && sang != null && Math.abs(toi - sang) < 6, `sáng ${sang} ↔ tối ${toi}`);
  } finally {
    await ctx.close();
  }
}
