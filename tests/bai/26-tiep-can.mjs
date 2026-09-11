import { GOC, moTrang } from '../tro-giup.mjs';

/**
 * Soát khả năng tiếp cận trên mấy trang chính.
 *
 * Mấy lỗi ở đây KHÔNG nhìn thấy được bằng mắt — ảnh chụp màn hình đẹp y hệt dù
 * có hay không. Chỉ người dùng bộ đọc màn hình và máy tìm kiếm là thấy, mà cả
 * hai thì không báo lại cho ai. Nên chúng phải được canh bằng bài kiểm.
 *
 * Đã tìm ra hai lỗi thật ngay lượt chạy đầu: `/game` không có thẻ h1 nào (trang
 * chính của cả kho, mở ra là không biết mình đang ở đâu), và `/duyet` để mấy
 * h2 của cột lọc đứng trước h1 trong DOM nên duyệt theo đầu đề sẽ gặp "Hệ máy"
 * trước khi gặp tên trang.
 */
const TRANG = [
  '/', '/game', '/bxh', '/duyet', '/tim?q=rong',
  '/game/dragon-hunter', '/game/dragon-hunter/dien-dan',
  '/dang-nhap', '/dang-ky', '/yeu-cau', '/an-toan',
];

export default async function chay(kiem) {
  const p = await moTrang();
  try {
    for (const t of TRANG) {
      await p.goto(GOC + t, { waitUntil: 'networkidle' });
      const loi = await p.evaluate(() => {
        const ra = [];
        const ten = (e) => (e.getAttribute('aria-label') || e.textContent || '').trim()
          || (e.querySelector('img')?.alt ?? '').trim();

        // Ảnh thiếu hẳn thuộc tính alt. `alt=""` thì HỢP LỆ — đó là cách nói
        // "ảnh này chỉ để trang trí", và mấy biểu tượng game đúng là thế.
        document.querySelectorAll('img').forEach((i) => {
          if (!i.hasAttribute('alt')) ra.push(`ảnh thiếu alt: ${i.src.slice(-40)}`);
        });

        // Nút và liên kết phải gọi được tên. Nút chỉ có một hình bên trong mà
        // không có `aria-label` thì bộ đọc chỉ đọc được "nút", hết.
        document.querySelectorAll('button, a[href]').forEach((e) => {
          if (!ten(e) && !e.getAttribute('aria-labelledby')) {
            ra.push(`${e.tagName.toLowerCase()} không có tên đọc được: ${e.outerHTML.slice(0, 80)}`);
          }
        });

        document.querySelectorAll('input, select, textarea').forEach((e) => {
          if (e.type === 'hidden') return;
          const coNhan = e.labels?.length || e.getAttribute('aria-label')
            || e.getAttribute('aria-labelledby') || e.closest('label');
          if (!coNhan) ra.push(`ô nhập không có nhãn: ${e.outerHTML.slice(0, 80)}`);
        });

        const id = [...document.querySelectorAll('[id]')].map((e) => e.id);
        const trung = [...new Set(id.filter((x, i) => id.indexOf(x) !== i))];
        if (trung.length) ra.push(`id trùng: ${trung.join(', ')}`);

        /*
         * Bậc đầu đề phải liền mạch: h1 rồi h2 rồi h3, không nhảy cóc.
         * Bộ đọc màn hình duyệt trang bằng cách nhảy giữa các đầu đề, nên một
         * bậc nhảy cóc là một tầng cấu trúc biến mất với họ.
         */
        const bac = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => +h.tagName[1]);
        if (bac.length && bac[0] !== 1) ra.push(`đầu đề đầu tiên là h${bac[0]}, không phải h1`);
        for (let i = 1; i < bac.length; i++) {
          if (bac[i] - bac[i - 1] > 1) ra.push(`nhảy bậc: h${bac[i - 1]} → h${bac[i]}`);
        }
        const soH1 = document.querySelectorAll('h1').length;
        if (soH1 !== 1) ra.push(`có ${soH1} thẻ h1, cần đúng 1`);
        return ra;
      });

      kiem(`${t} — sạch về khả năng tiếp cận`, loi.length === 0, loi.join(' | '));
    }
  } finally {
    await p.close();
  }
}
