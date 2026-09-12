import { GOC, moTrinhDuyet } from '../tro-giup.mjs';

/**
 * Màn hình HẸP 320px, và điều hướng bằng bàn phím.
 *
 * 320px không phải một con số chọn bừa: đó là cỡ màn hình máy Android đời cũ,
 * tức là đúng người mở một cửa hàng game Java. Bộ kiểm trước giờ chỉ chạy ở 1280px
 * còn ảnh chụp ở 390px, nên khoảng hẹp nhất chưa ai nhìn — và lượt soát đầu
 * tiên ra ngay một lỗi: trang `/duyet` tràn 51px và cuộn ngang cả trang.
 */
const TRANG = ['/', '/game', '/bxh', '/duyet', '/tim?q=rong', '/game/dragon-hunter',
  '/game/dragon-hunter/dien-dan', '/game/dragon-hunter/danh-gia',
  '/dang-nhap', '/yeu-cau', '/an-toan', '/toi'];

export default async function chay(kiem) {
  const may = await moTrinhDuyet();

  // ── Màn hẹp: không trang nào được cuộn ngang ──────────────────────────
  const hep = await may.newContext({ viewport: { width: 320, height: 640 } });
  const p = await hep.newPage();
  try {
    for (const t of TRANG) {
      await p.goto(GOC + t, { waitUntil: 'networkidle' });
      const loi = await p.evaluate(() => {
        const ra = [];
        const rong = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > rong + 1) {
          ra.push(`cả trang cuộn ngang: ${document.documentElement.scrollWidth}px > ${rong}px`);
        }
        document.querySelectorAll('body *').forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.width === 0) return;
          /*
           * Bỏ qua thứ nằm trong một khối CỐ Ý cuộn ngang — kệ game, hàng
           * chip. Mấy khối ấy tràn là đúng thiết kế; cái sai là khi chúng đẩy
           * cả TRANG cuộn theo.
           */
          let cha = e.parentElement;
          while (cha) {
            const ov = getComputedStyle(cha).overflowX;
            if (ov === 'auto' || ov === 'scroll') return;
            cha = cha.parentElement;
          }
          if (r.right > rong + 1) {
            ra.push(`tràn ${Math.round(r.right - rong)}px: ${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 34)}`);
          }
        });
        return [...new Set(ra)].slice(0, 3);
      });
      kiem(`${t} — vừa màn 320px`, loi.length === 0, loi.join(' | '));
    }
  } finally {
    await hep.close();
  }

  // ── Bàn phím ──────────────────────────────────────────────────────────
  const rong = await may.newContext({ viewport: { width: 1280, height: 900 } });
  const k = await rong.newPage();
  try {
    for (const t of ['/', '/game', '/game/dragon-hunter', '/duyet', '/dang-nhap']) {
      await k.goto(GOC + t, { waitUntil: 'networkidle' });
      const loi = [];

      // Lối nhảy thẳng tới nội dung phải là thứ Tab đầu tiên chạm tới — không
      // thì người dùng bàn phím phải Tab qua cả thanh điều hướng ở MỌI trang.
      await k.keyboard.press('Tab');
      const dau = await k.evaluate(() => (document.activeElement?.textContent ?? '').trim());
      if (!dau.includes('Tới nội dung')) loi.push(`Tab đầu không phải lối nhảy: “${dau.slice(0, 40)}”`);

      /*
       * Mọi chặng Tab đều phải THẤY được vòng tiêu điểm.
       *
       * Bấm Tab thật chứ không gọi `focus()` bằng mã: `:focus-visible` chỉ áp
       * khi tiêu điểm tới từ bàn phím, nên gọi `focus()` rồi đo là đo nhầm —
       * nó báo hỏng ở mọi phần tử, kể cả những chỗ đang đúng. Đã dính đúng
       * chuyện ấy ở lượt soát đầu.
       */
      for (let i = 0; i < 40; i++) {
        await k.keyboard.press('Tab');
        const x = await k.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return null;
          const r = e.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return null;
          const s = getComputedStyle(e);
          const co = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
            || s.boxShadow !== 'none';
          return co ? null : `${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 30)}`;
        });
        if (x) loi.push(`không thấy vòng tiêu điểm: ${x}`);
      }

      // `tabindex` dương phá tan thứ tự tự nhiên của trang: phần tử mang nó
      // nhảy lên trước tất cả, kể cả những thứ nằm phía trên nó trên màn hình.
      const duong = await k.evaluate(() => [...document.querySelectorAll('[tabindex]')]
        .filter((e) => Number(e.getAttribute('tabindex')) > 0).length);
      if (duong > 0) loi.push(`${duong} phần tử có tabindex dương`);

      kiem(`${t} — đi được bằng bàn phím`, loi.length === 0, [...new Set(loi)].slice(0, 3).join(' | '));
    }
  } finally {
    await rong.close();
  }
}
