import { GOC, moTrang } from '../tro-giup.mjs';

/**
 * PWA: cài được, và mất mạng vẫn có gì đó tử tế hiện ra.
 *
 * Mục đáng giá nhất là mục CUỐI: service worker KHÔNG được lưu đệm HTML. Mọi
 * tuyến ở đây đều mang trạng thái đăng nhập, nên một trang HTML nằm trong bộ
 * đệm là một trang có thể trả lại cho người khác trên cùng máy. Bài kiểm dựng
 * đúng tình huống ấy: tải trang, rồi soi xem trong kho đệm có gì.
 */
export default async function chay(kiem) {
  const p = await moTrang();

  try {
    // ── Bản kê khai đủ thứ cần để cài ─────────────────────────────────
    const kk = await (await fetch(`${GOC}/manifest.webmanifest`)).json();
    kiem('bản kê khai chạy toàn màn hình', kk.display === 'standalone', kk.display);
    kiem('bản kê khai có biểu tượng maskable',
      kk.icons?.some((i) => i.purpose === 'maskable'),
      JSON.stringify(kk.icons?.map((i) => i.purpose)));
    kiem('bản kê khai có màu chủ đề', !!kk.theme_color, kk.theme_color);

    // ── Service worker phục vụ đúng kiểu MIME ─────────────────────────
    const sw = await fetch(`${GOC}/sw.js`);
    kiem('sw.js tải được', sw.ok, `mã ${sw.status}`);
    kiem('sw.js đúng kiểu tệp JavaScript',
      (sw.headers.get('content-type') ?? '').includes('javascript'),
      sw.headers.get('content-type') ?? '');

    // ── Đăng ký và chờ nó nhận việc ───────────────────────────────────
    await p.goto(GOC, { waitUntil: 'networkidle' });

    /*
     * Bài kiểm tự đăng ký lấy, không đợi thành phần `DangKySW`.
     *
     * Thành phần ấy cố ý chỉ chạy ở bản dựng thật (`NODE_ENV === 'production'`),
     * mà bộ kiểm có thể chạy trên bản dựng khác. Đăng ký tay ở đây thì bài kiểm
     * canh đúng thứ nó định canh — nội dung của `sw.js` — chứ không canh nhầm
     * biến môi trường.
     */
    const sanSang = await p.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'trình duyệt không hỗ trợ';
      const dk = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return dk.active ? 'xong' : 'chưa nhận việc';
    });
    kiem('service worker đăng ký và nhận việc được', sanSang === 'xong', sanSang);

    // ── Ghim sẵn trang ngoại tuyến ────────────────────────────────────
    const daGhim = await p.evaluate(async () => {
      const co = await caches.match('/ngoai-tuyen.html');
      return !!co;
    });
    kiem('trang ngoại tuyến được ghim sẵn vào bộ đệm', daGhim);

    // ── Mất mạng thì ra trang ngoại tuyến, không phải trang lỗi ───────
    await p.context().setOffline(true);
    await p.goto(`${GOC}/game`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    // Gộp mọi khoảng trắng về một dấu cách trước khi so. Câu trên trang bị
    // xuống dòng trong mã nguồn, nên `textContent` mang theo cả dấu xuống dòng
    // lẫn phần thụt đầu dòng — so chuỗi con thô thì trượt vì một lẽ chẳng liên
    // quan gì tới thứ bài kiểm định canh.
    const chu = (await p.locator('body').textContent()).replace(/\s+/g, ' ');
    kiem('mất mạng thì hiện trang ngoại tuyến tiếng Việt',
      chu.includes('Đang mất mạng'), chu.slice(0, 100));
    kiem('trang ngoại tuyến nói rõ game đã tải vẫn chơi được',
      chu.includes('vẫn chơi được bình thường'));
    await p.context().setOffline(false);

    /*
     * ── KHÔNG một trang HTML nào nằm trong bộ đệm ─────────────────────
     *
     * Trừ đúng trang ngoại tuyến, vốn là tệp tĩnh không mang trạng thái ai cả.
     */
    await p.goto(`${GOC}/game`, { waitUntil: 'networkidle' });
    await p.goto(`${GOC}/bxh`, { waitUntil: 'networkidle' });
    const trongKho = await p.evaluate(async () => {
      const ten = await caches.keys();
      const dia = [];
      for (const t of ten) {
        const kho = await caches.open(t);
        for (const yc of await kho.keys()) dia.push(new URL(yc.url).pathname);
      }
      return dia;
    });
    const htmlLot = trongKho.filter((d) => d !== '/ngoai-tuyen.html'
      && !d.startsWith('/_next/static/') && !d.startsWith('/bieu-tuong-'));
    kiem('không có trang HTML nào lọt vào bộ đệm',
      htmlLot.length === 0, `lọt: ${htmlLot.join(', ')}`);
    kiem('tệp tĩnh của bản dựng thì CÓ được lưu đệm',
      trongKho.some((d) => d.startsWith('/_next/static/')),
      `kho có ${trongKho.length} mục`);
  } finally {
    // Gỡ service worker ra, không để nó ám sang mấy bài chạy sau trong cùng
    // trình duyệt — bộ đệm còn lại có thể làm bài khác thấy tệp cũ.
    await p.evaluate(async () => {
      for (const dk of await navigator.serviceWorker.getRegistrations()) await dk.unregister();
      for (const t of await caches.keys()) await caches.delete(t);
    }).catch(() => {});
    await p.close();
  }
}
