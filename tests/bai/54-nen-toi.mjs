import { GOC, LOI, moTrinhDuyet } from '../tro-giup.mjs';

/**
 * NỀN TỐI PHẢI SỐNG SÓT QUA HYDRATION.
 *
 * Bài này sinh ra từ một lỗi thật, và là lỗi chỉ nhìn ảnh chụp mới thấy: nền
 * tối hiện đúng một khoảnh khắc rồi trắng loá.
 *
 * Nguyên do: lựa chọn nền cũ giữ trong `localStorage`, rồi một đoạn mã trong
 * `<head>` đặt `data-nen` trước khi trang vẽ. Máy chủ dựng ra `<html>` KHÔNG
 * có thuộc tính ấy, trình duyệt thì có — hai bản khác nhau, nên React báo lỗi
 * hydration rồi tự dựng lại thẻ `<html>` cho khớp bản máy chủ, tức là XOÁ mất
 * `data-nen`. `suppressHydrationWarning` chỉ tắt lời cảnh báo chứ không ngăn
 * React sửa lại thẻ.
 *
 * Nay lựa chọn nằm trong BÁNH QUY nên máy chủ đọc được và dựng sẵn thuộc tính.
 * Bài kiểm chờ hẳn cho hydration chạy xong rồi mới đo — đo sớm thì lỗi cũ vẫn
 * xanh như thường.
 */
export default async function chay(kiem) {
  const may = await moTrinhDuyet();
  const ctx = await may.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'sunny-nen', value: 'toi', url: GOC, sameSite: 'Lax' }]);
  const p = await ctx.newPage();

  const loi = [];
  p.on('pageerror', (e) => loi.push(String(e)));

  try {
    for (const duong of ['/', '/game/bounce-tales', '/quan-ly']) {
      await p.goto(GOC + duong, { waitUntil: 'domcontentloaded' });
      kiem(`máy chủ dựng sẵn nền tối cho ${duong}`,
        (await p.evaluate(() => document.documentElement.dataset.nen)) === 'toi');

      // Chờ hydration: đây mới là lúc lỗi cũ ra mặt.
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(1200);
      const sau = await p.evaluate(() => ({
        nen: document.documentElement.dataset.nen,
        mau: getComputedStyle(document.body).backgroundColor,
      }));
      kiem(`hydration xong vẫn còn nền tối ở ${duong}`, sau.nen === 'toi', JSON.stringify(sau));

      /* Đo cả MÀU THẬT, không chỉ thuộc tính: thuộc tính còn mà biến CSS không
         đổi thì người dùng vẫn nhìn thấy một trang trắng. */
      const [r, g, b] = (sau.mau.match(/\d+/g) ?? []).map(Number);
      kiem(`nền vẽ ra thật sự tối ở ${duong}`, r + g + b < 200, sau.mau);
    }

    kiem('không có lỗi hydration nào ném ra',
      !loi.some((l) => l.includes('418') || l.toLowerCase().includes('hydrat')),
      loi.join(' | ').slice(0, 200));

    /*
     * ── CHỮ BÁO LỖI PHẢI ĐỌC ĐƯỢC TRÊN NỀN TỐI ────────────────────────
     *
     * Đây là lỗi thật, và chỉ đo mới thấy: sắc đỏ báo lỗi xưa nay dùng chung
     * một giá trị cho cả nền sáng lẫn nền tối. Trên nền sáng nó đạt 4,77:1,
     * nhưng trên mặt thẻ tối chỉ còn 3,54:1 — dưới chuẩn AA, tức là MỌI câu
     * báo lỗi trong cửa hàng đều khó đọc ở nền tối. Mà báo lỗi đúng là thứ
     * người ta cần đọc được nhất, và người đọc nó thường đang bực sẵn.
     *
     * Đo bằng màu TÍNH RA CUỐI CÙNG chứ không so chuỗi biến CSS: chỉ có con số
     * ấy mới nói được người dùng thật sự nhìn thấy gì.
     */
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', 'khong-co-ai-ten-nay');
    await p.fill('input[name="matKhau"]', 'sai-be-bet');
    await p.click('button[type="submit"]');
    await p.waitForSelector(LOI, { timeout: 15_000 }).catch(() => {});

    const do1 = await p.locator(LOI).first().evaluate((n) => {
      const doc = (el) => getComputedStyle(el).backgroundColor;
      // Lần ngược lên tìm nền ĐẶC đầu tiên: ô báo lỗi tự tô một lớp đỏ rất
      // nhạt trong suốt, nên nền thật của nó nằm ở thẻ cha nào đó.
      let cha = n;
      let nen = 'rgba(0, 0, 0, 0)';
      while (cha && (nen === 'rgba(0, 0, 0, 0)' || nen === 'transparent')) {
        cha = cha.parentElement;
        if (cha) nen = doc(cha);
      }
      return { chu: getComputedStyle(n).color, nen };
    });

    const soMau = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const sang = ([r, g, b]) => {
      const f = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : (((c / 255) + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const a = sang(soMau(do1.chu));
    const b2 = sang(soMau(do1.nen));
    const tiLe = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);

    kiem('chữ báo lỗi trên nền tối đạt chuẩn tương phản AA',
      tiLe >= 4.5, `${tiLe.toFixed(2)}:1 — ${do1.chu} trên ${do1.nen}`);
  } finally {
    await ctx.close();
  }
}
