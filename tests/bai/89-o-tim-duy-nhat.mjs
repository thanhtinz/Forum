import { GOC, moTrang } from '../tro-giup.mjs';

/**
 * MỘT Ô TÌM, VÀ NÓ NHỚ TỪ KHOÁ.
 *
 * Ô tìm nằm ở bố cục gốc — một thành phần máy chủ, mà thành phần máy chủ thì
 * không đọc được `searchParams`. Nên nó LUÔN RỖNG, kể cả khi đang đứng giữa
 * trang kết quả: gõ "bounce", bấm Enter, ra trang kết quả, mà ô trên thanh
 * trắng trơn như chưa tìm gì.
 *
 * Trang tìm chữa tạm bằng một ô THỨ HAI trong thân trang có điền sẵn từ khoá,
 * và thế là trên điện thoại có hai ô y hệt nhau xếp chồng. App Store chỉ có
 * đúng một.
 *
 * Nên bài này canh hai mặt của cùng một bản sửa: đúng MỘT ô ở mọi trang, và ô
 * ấy phải nói đúng thứ đang bày ra — kể cả sau khi bấm nút lùi của trình
 * duyệt, chỗ dễ quên nhất.
 */
export default async function chay(kiem) {
  let p;
  try {
    p = await moTrang();
    const dem = () => p.locator('input[name="q"]').count();
    const chu = () => p.locator('input[name="q"]').first().inputValue();

    for (const [khoKhung, co] of [['điện thoại', { width: 430, height: 932 }],
                                  ['máy bàn', { width: 1280, height: 900 }]]) {
      await p.setViewportSize(co);
      for (const [ten, d] of [['trang chủ', '/'], ['trang tìm', '/tim'],
                              ['trang kết quả', '/tim?q=bounce']]) {
        await p.goto(`${GOC}${d}`, { waitUntil: 'networkidle' });
        kiem(`${khoKhung}: ${ten} có ĐÚNG MỘT ô tìm`, (await dem()) === 1,
          `đếm được ${await dem()}`);
      }
      kiem(`${khoKhung}: ở trang kết quả, ô tìm mang sẵn từ khoá`,
        (await chu()) === 'bounce', `ô đang là "${await chu()}"`);
    }

    // ── Gõ ở một trang bất kỳ rồi Enter thì đi tìm thật ────────────────
    await p.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    await p.fill('input[name="q"]', 'snake');
    await p.press('input[name="q"]', 'Enter');
    await p.waitForURL('**/tim**', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(800);
    kiem('gõ ở trang chủ rồi Enter thì sang trang kết quả',
      new URL(p.url()).searchParams.get('q') === 'snake', p.url());
    kiem('và ô vẫn giữ nguyên chữ vừa gõ', (await chu()) === 'snake');

    /*
     * BẤM LÙI thì ô phải dọn theo địa chỉ.
     *
     * Đây là chỗ một cái ô "tự giữ lấy chữ" sẽ sai: nó đứng lại ở chữ gõ lần
     * cuối trong khi trang đã lùi về chỗ khác, và người đọc ra là trang hỏng.
     */
    await p.goBack();
    await p.waitForTimeout(1500);
    kiem('bấm lùi về trang chủ thì ô tự dọn', (await chu()) === '',
      `ô còn "${await chu()}"`);
  } finally {
    if (p) await p.close();
  }
}
