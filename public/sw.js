/*
 * SERVICE WORKER — chỉ lo hai việc, và cố ý không lo việc thứ ba.
 *
 * 1. GHIM SẴN trang ngoại tuyến và mấy biểu tượng, để mất mạng vẫn có cái gì
 *    đó tử tế hiện ra thay vì trang lỗi mặc định của trình duyệt.
 * 2. LƯU ĐỆM tệp tĩnh của bản dựng (`/_next/static/…`). Mấy tệp ấy mang mã băm
 *    trong tên nên một tệp đã lưu KHÔNG BAO GIỜ cũ đi được: bản dựng mới sinh
 *    tên mới, và trang mới chỉ trỏ tới tên mới.
 *
 * KHÔNG lưu đệm HTML. Đây là quyết định quan trọng nhất ở đây.
 *
 * Mọi tuyến của trang này đều dựng theo từng lượt và mang trạng thái đăng nhập
 * — tên người dùng ở góc, số trên chuông, nút quản trị. Lưu một trang như thế
 * rồi trả lại từ bộ đệm là có ngày máy dùng chung hiện tên người trước, hoặc
 * hiện nút quản trị cho người không phải quản trị. Một cửa hàng chạy chậm hơn
 * vài trăm mili giây thì không ai chết; một trang lộ phiên người khác thì có.
 *
 * Nên HTML luôn đi thẳng ra mạng, và chỉ khi mạng hỏng mới rơi về trang ngoại
 * tuyến đã ghim.
 */

const PHIEN_BAN = 'sunny-v1';
const GHIM = [
  '/ngoai-tuyen.html',
  '/bieu-tuong-192.png',
  '/bieu-tuong-512.png',
];

self.addEventListener('install', (su) => {
  su.waitUntil(
    caches.open(PHIEN_BAN)
      .then((kho) => kho.addAll(GHIM))
      // `skipWaiting` để bản mới nhận việc ngay, không đợi đóng hết tab cũ.
      // Nếu ghim hỏng (mạng chập lúc cài) thì vẫn cho qua: một service worker
      // thiếu trang ngoại tuyến vẫn hơn là không có service worker nào.
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (su) => {
  su.waitUntil(
    caches.keys()
      .then((ten) => Promise.all(
        ten.filter((t) => t !== PHIEN_BAN).map((t) => caches.delete(t)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (su) => {
  const yc = su.request;

  // Chỉ đụng vào GET. POST là server action, là đăng nhập, là gửi bài — đụng
  // vào mấy thứ ấy thì hỏng theo kiểu không ai lần ra được.
  if (yc.method !== 'GET') return;

  const dia = new URL(yc.url);
  if (dia.origin !== self.location.origin) return;

  // Tệp tĩnh mang mã băm: lấy từ đệm trước, không có thì tải rồi cất lại.
  if (dia.pathname.startsWith('/_next/static/') || GHIM.includes(dia.pathname)) {
    su.respondWith(
      caches.match(yc).then((co) => co ?? fetch(yc).then((tra) => {
        // Chỉ cất bản trả về bình thường. Cất nhầm một lỗi 404 vào đệm thì nó
        // ở lại đó mãi, và tệp ấy vĩnh viễn hỏng với riêng máy này.
        if (tra.ok && tra.type === 'basic') {
          const ban = tra.clone();
          caches.open(PHIEN_BAN).then((kho) => kho.put(yc, ban));
        }
        return tra;
      })),
    );
    return;
  }

  // HTML: ra mạng, hỏng thì mới về trang ngoại tuyến. Không bao giờ cất lại.
  if (yc.mode === 'navigate') {
    su.respondWith(
      fetch(yc).catch(() => caches.match('/ngoai-tuyen.html').then(
        (co) => co ?? new Response('Đang mất mạng.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
      )),
    );
  }
});
