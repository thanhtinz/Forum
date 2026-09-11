import { execFileSync } from 'node:child_process';
import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * TÌM KIẾM KHÔNG DẤU.
 *
 * Đây là lỗi nặng nhất mà một ô tìm kiếm tiếng Việt mắc được: người Việt gõ
 * trên điện thoại phần lớn KHÔNG bỏ dấu, nên gõ "rong" mà không ra "Thợ săn
 * rồng" thì với họ cửa hàng này coi như không có game ấy — chứ không phải họ
 * thua một dấu huyền.
 *
 * Bài kiểm dựng một game có dấu rồi gõ đủ kiểu để tìm nó.
 */
/*
 * Kiểm qua HÀNH VI THẬT, không nhập thẳng hàm từ `.ts`.
 *
 * Nhập `.ts` vào một tệp `.mjs` thì Node chạy được nhưng kêu một dòng cảnh báo
 * mỗi lượt, và cả bộ kiểm chưa có chỗ nào làm thế. Mà mấy mục dưới đây đi qua
 * đúng đường người dùng đi — gõ vào ô tìm rồi xem có ra không — nên chúng
 * chứng minh được y hệt, lại còn bắt được cả lỗi ở tầng truy vấn.
 */
export default async function chay(kiem) {
  // Tên cố ý mang chữ Đ: Đ là CHỮ CÁI RIÊNG chứ không phải D kèm dấu, nên
  // bước gỡ dấu thông thường không đụng tới nó. Chính chỗ này từng làm hỏng
  // đường dẫn thể loại "Đua xe" thành "ua-xe".
  const TEN = 'Kiểm Tìm Rồng Đỏ';
  await don(TEN);

  const p = await moTrang();
  try {
    const tl = await db.theLoai.findFirst({ where: { ten: 'Đua xe' }, select: { id: true, ten: true } });
    /*
     * Dựng game rồi gọi KỊCH BẢN LẤP để nó tự tính chuỗi tìm.
     *
     * Không tự tính ở đây rồi ghi vào: làm thế là bài kiểm tự chấm bài của
     * chính nó — chuỗi nó ghi vào sẽ khớp với chuỗi nó mong đợi kể cả khi hàm
     * thật hỏng. Đi qua kịch bản thì thứ đang được canh là hàm thật.
     */
    const game = await db.game.create({
      data: {
        ten: TEN, duongDan: 'kiem-tim-rong-do', trangThai: 'DANG_HIEN',
        dangLuc: new Date(), nhaPhatTrien: 'Hãng Thử Nghiệm',
        ...(tl ? { theLoai: { create: { theLoaiId: tl.id } } } : {}),
      },
      select: { id: true },
    });
    execFileSync('npx', ['tsx', 'scripts/lap-chuoi-tim.ts'], { encoding: 'utf8' });

    const tim = async (q) => {
      await p.goto(`${GOC}/tim?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
      return (await p.locator('main').textContent()).includes(TEN);
    };

    kiem('gõ đủ dấu thì ra', await tim('Rồng Đỏ'));
    kiem('gõ KHÔNG dấu vẫn ra', await tim('rong do'));
    kiem('gõ hoa hết vẫn ra', await tim('RONG DO'));
    kiem('gõ nửa dấu nửa không vẫn ra', await tim('rong Đỏ'));
    kiem('tìm theo tên hãng không dấu', await tim('hang thu nghiem'));
    if (tl) kiem('tìm theo tên thể loại không dấu', await tim('dua xe'));

    // Nhiều từ phải khớp HẾT, không phải khớp một trong số đó.
    kiem('hai từ đều khớp thì ra', await tim('rong hang'));
    kiem('một từ lạc thì KHÔNG ra', !(await tim('rong xyzkhonghe')));

    // ── Kịch bản lấp chạy lại nhiều lần vẫn đúng ───────────────────────
    await db.game.update({
      where: { id: game.id }, data: { ten: 'Kiểm Tìm Đổi Tên Rồi' }, select: { id: true },
    });
    execFileSync('npx', ['tsx', 'scripts/lap-chuoi-tim.ts'], { encoding: 'utf8' });
    await p.goto(`${GOC}/tim?q=doi+ten+roi`, { waitUntil: 'networkidle' });
    kiem('chạy lại kịch bản lấp thì tên mới tìm được',
      (await p.locator('main').textContent()).includes('Kiểm Tìm Đổi Tên Rồi'));
  } finally {
    await don(TEN);
    await don('Kiểm Tìm Đổi Tên Rồi');
    await p.close();
  }
}

async function don(ten) {
  await db.game.deleteMany({ where: { ten } });
}
