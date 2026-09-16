import { GOC, moTrang } from '../tro-giup.mjs';

/**
 * GÕ SAI ĐỊA CHỈ KHÔNG ĐƯỢC LÀM SẬP CẢ CỬA HÀNG.
 *
 * Cửa hàng có bốn bố cục gốc, mỗi cái trong một nhóm tuyến riêng, nên ở mức
 * trên cùng không còn bố cục nào bọc lấy `not-found.tsx`. Đặt trang 404 ở đó
 * thì Next từ chối dựng nó, mà nó hỏng thì `/_not-found` hỏng theo — và từ lượt
 * gõ sai đầu tiên trở đi, MỌI trang đều trả 500, kể cả trang chủ.
 *
 * Nên bài này canh hai thứ, và thứ hai mới là thứ quan trọng:
 *   • gõ sai thì trả đúng mã 404, ra trang tiếng Việt có lối đi tiếp;
 *   • và ngay sau lượt gõ sai ấy, trang thật vẫn mở bình thường.
 */
export default async function chay(kiem) {
  const trang = await moTrang();
  try {
    const tl = await trang.goto(`${GOC}/duong-dan-khong-he-co-that`, { waitUntil: 'networkidle' });
    kiem('đường dẫn không có thật trả mã 404, không phải 500', tl.status() === 404,
      `máy trả ${tl.status()}`);

    const chu = await trang.locator('body').innerText();
    kiem('và ra trang 404 tiếng Việt của cửa hàng', chu.includes('Không có trang này'));
    kiem('trang 404 vẫn còn lối đi tiếp',
      (await trang.locator('a[href="/game"]').count()) >= 1);

    // Đúng chỗ hỏng cũ: một lượt gõ sai làm hỏng luôn mọi lượt sau.
    const sau = await trang.goto(`${GOC}/game`, { waitUntil: 'networkidle' });
    kiem('sau lượt gõ sai, trang thật vẫn mở bình thường', sau.status() === 200,
      `máy trả ${sau.status()}`);
  } finally {
    await trang.close();
  }
}
