import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-danh-gia-tg';

/**
 * ĐÁNH GIÁ GAME CỦA TÔI — trang mới trong cổng nhà phát triển.
 *
 * Người chơi chấm sao và viết lời ngay trên trang game, nhưng tác giả thì
 * không có chỗ nào đọc cho gọn, cũng không đáp được: nút trả lời xưa nay chỉ
 * hiện cho ban quản trị. Nghĩa là người bán hàng biết tin sau cùng và không
 * nói lại được một câu nào.
 *
 * Mục kiểm nặng nhất ở đây là QUYỀN, vì trang này mở một địa chỉ POST mới cho
 * hàng trăm tác giả: tác giả A phải không đọc và không đáp được bài của game
 * tác giả B.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.danhGia.deleteMany({ where: { game: { duongDan: { startsWith: DAU } } } });
    await db.game.deleteMany({ where: { duongDan: { startsWith: DAU } } });
    await db.thongBao.deleteMany({ where: { nguoi: { tenDangNhap: { startsWith: DAU } } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
  };
  await don();

  let aPage; let bPage;
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const matKhauBam = await bcrypt.hash('thanhvien123', 10);
    const taoNguoi = (hau, ten, vaiTro) => db.nguoiDung.create({
      data: {
        tenDangNhap: `${DAU}-${hau}`, tenHienThi: ten, vaiTro,
        email: `${DAU}-${hau}@kiemthu.local`, matKhauBam,
      },
      select: { id: true },
    });

    const a = await taoNguoi('a', 'Tác Giả A', 'TAC_GIA');
    const b = await taoNguoi('b', 'Tác Giả B', 'TAC_GIA');
    const nguoiChoi = await taoNguoi('choi', 'Người Chơi', 'THANH_VIEN');

    const gameA = await db.game.create({
      data: { ten: 'Game A kiểm thử', duongDan: `${DAU}-a`, trangThai: 'DANG_HIEN', tacGiaId: a.id },
      select: { id: true },
    });
    const gameB = await db.game.create({
      data: { ten: 'Game B kiểm thử', duongDan: `${DAU}-b`, trangThai: 'DANG_HIEN', tacGiaId: b.id },
      select: { id: true },
    });

    const baiA = await db.danhGia.create({
      data: { gameId: gameA.id, nguoiId: nguoiChoi.id, sao: 2, noiDung: 'Game hay nhưng hay văng.' },
      select: { id: true },
    });
    const baiB = await db.danhGia.create({
      data: { gameId: gameB.id, nguoiId: nguoiChoi.id, sao: 1, noiDung: 'Bài đánh giá của game B.' },
      select: { id: true },
    });
    // Bài chấm sao SUÔNG: không có lời nào để đáp, nên không được bày ra.
    await db.danhGia.create({
      data: { gameId: gameA.id, nguoiId: a.id, sao: 5 },
      select: { id: true },
    });

    /* ── Tác giả A chỉ thấy bài của game mình ──────────────────────────── */
    aPage = await moTrangDaDangNhap(`${DAU}-a`, 'thanhvien123');
    await aPage.goto(`${GOC}/quan-ly/danh-gia`, { waitUntil: 'networkidle' });

    kiem('tác giả thấy bài đánh giá game của mình',
      (await aPage.locator('text=Game hay nhưng hay văng.').count()) > 0);
    kiem('và KHÔNG thấy bài đánh giá game của tác giả khác',
      (await aPage.locator('text=Bài đánh giá của game B.').count()) === 0);
    kiem('bài chấm sao suông không bày ra chỗ chờ trả lời',
      (await aPage.locator('main li').count()) === 1);

    /* ── Huy hiệu trên thanh trên đếm đúng số bài đang chờ ──────────────── */
    kiem('thanh trên đếm số bài chưa trả lời',
      (await aPage.locator('header a[href="/quan-ly/danh-gia"]').first().textContent() ?? '')
        .includes('1'));

    /* ── Trả lời thì ghi vào bài, và người viết được báo ────────────────── */
    let donHang = null;
    aPage.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      // Bánh quy do ngữ cảnh trình duyệt tự gắn, bỏ ra khỏi bản chép — giữ lại
      // thì hoá ra phát lại bằng chính phiên của A, kiểm cái gì nữa.
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });

    await aPage.click('button:has-text("Trả lời bài này")');
    await aPage.fill('textarea[aria-label="Lời trả lời của cửa hàng"]', 'Cảm ơn bạn, bản sau sẽ vá.');
    await aPage.click('button:has-text("Lưu lời trả lời")');

    kiem('tác giả trả lời thì ghi vào bài đánh giá', await doiToi(async () => {
      const d = await db.danhGia.findUnique({ where: { id: baiA.id }, select: { traLoi: true } });
      return d?.traLoi === 'Cảm ơn bạn, bản sau sẽ vá.';
    }));
    kiem('người viết đánh giá được báo có lời đáp', await doiToi(async () =>
      (await db.thongBao.count({ where: { nguoiId: nguoiChoi.id, loai: 'DAP_DANH_GIA' } })) === 1));

    await aPage.goto(`${GOC}/quan-ly/danh-gia`, { waitUntil: 'networkidle' });
    kiem('đáp xong thì bài rời khỏi chồng việc đang chờ',
      (await aPage.locator('text=Game hay nhưng hay văng.').count()) === 0);
    await aPage.goto(`${GOC}/quan-ly/danh-gia?loc=`, { waitUntil: 'networkidle' });
    kiem('nhưng vẫn tìm lại được ở bộ lọc "Tất cả"',
      (await aPage.locator('text=Game hay nhưng hay văng.').count()) > 0);

    /*
     * ── TÁC GIẢ B PHÁT LẠI ĐÚNG YÊU CẦU ẤY ───────────────────────────────
     *
     * Mã băm của hàm và thân yêu cầu đều đúng y bản gốc — trong thân có sẵn mã
     * bài đánh giá của game A — chỉ khác cái bánh quy. Nên thứ duy nhất chặn
     * được nó là điều kiện `tacGiaId` nằm trong `where` của chính hàm ấy.
     */
    kiem('bắt được cả mã băm và thân yêu cầu để phát lại',
      !!donHang?.dau?.['next-action'] && !!donHang?.than);

    bPage = await moTrangDaDangNhap(`${DAU}-b`, 'thanhvien123');
    await bPage.goto(`${GOC}/quan-ly/danh-gia`, { waitUntil: 'networkidle' });

    if (donHang) {
      /*
       * Đặt một lời đáp KHÁC hẳn trước khi phát lại.
       *
       * Để nguyên lời cũ thì cú phát lại ghi đè đúng bằng chuỗi đang có, và
       * phép kiểm "không đổi" hoá ra đọc được cả khi B ghi đè thành công —
       * một dấu tích xanh chẳng chứng minh gì.
       */
      await db.danhGia.update({
        where: { id: baiA.id }, data: { traLoi: 'Lời đáp gốc của A.' },
      });
      const ma = await bPage.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      await bPage.waitForTimeout(800);

      const conNguyen = await db.danhGia.findUnique({
        where: { id: baiA.id }, select: { traLoi: true },
      });
      kiem('tác giả B phát lại yêu cầu thì không sửa được lời đáp của game A',
        conNguyen?.traLoi === 'Lời đáp gốc của A.',
        `máy trả về ${ma}, lời đáp hiện là ${JSON.stringify(conNguyen?.traLoi)}`);
    }

    /* ── B đáp bài của chính game B thì vẫn được ────────────────────────── */
    await bPage.click('button:has-text("Trả lời bài này")');
    await bPage.fill('textarea[aria-label="Lời trả lời của cửa hàng"]', 'B đã đọc góp ý.');
    await bPage.click('button:has-text("Lưu lời trả lời")');
    kiem('tác giả B vẫn đáp được bài của game mình', await doiToi(async () => {
      const d = await db.danhGia.findUnique({ where: { id: baiB.id }, select: { traLoi: true } });
      return d?.traLoi === 'B đã đọc góp ý.';
    }));

    /*
     * ── ĐÁP ĐƯỢC NGAY TRÊN TRANG GAME ────────────────────────────────────
     *
     * Người chơi viết lời ở đây, nên chỗ đáp gọn nhất cũng là đây. Nút chỉ
     * hiện cho tác giả CỦA GAME ẤY — tác giả khác mở cùng trang thì không.
     */
    const NUT_DAP = 'button:has-text("Trả lời bài này"), button:has-text("Sửa lời trả lời")';
    await aPage.goto(`${GOC}/game/${DAU}-a`, { waitUntil: 'networkidle' });
    kiem('tác giả thấy nút trả lời ngay trên trang game của mình',
      (await aPage.locator(NUT_DAP).count()) > 0);

    await bPage.goto(`${GOC}/game/${DAU}-a`, { waitUntil: 'networkidle' });
    kiem('tác giả khác mở cùng trang ấy thì KHÔNG thấy nút trả lời',
      (await bPage.locator(NUT_DAP).count()) === 0);
  } finally {
    if (aPage) await aPage.close();
    if (bPage) await bPage.close();
    await don();
  }
}
