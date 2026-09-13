import { GOC, moTrinhDuyet } from '../tro-giup.mjs';

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
  } finally {
    await ctx.close();
  }
}
