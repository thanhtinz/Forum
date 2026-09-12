import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * TRANG TÌM LÚC CHƯA GÕ GÌ, VÀ ĐẦU TRANG GAME.
 *
 * Cả hai đều lấy dáng App Store, và cả hai đều có một thứ dễ hỏng lặng lẽ:
 * trang tìm thì lưới thể loại phải TRỎ ĐÚNG chỗ (ô màu đẹp mà bấm vào không
 * ra gì thì tệ hơn dãy chip cũ), còn trang game thì nút tải ở đầu trang phải
 * đi thẳng tới tệp khi game chỉ có một hệ máy — thứ chỉ sai khi có game hai
 * hệ, tức là không ai thấy cho tới lúc thêm game thứ hai.
 */
export default async function chay(kiem) {
  const p = await moTrang();
  try {
    // ── Trang tìm lúc chưa gõ gì ──────────────────────────────────────
    await p.goto(`${GOC}/tim`, { waitUntil: 'networkidle' });
    const chu = await p.locator('body').textContent();

    kiem('trang tìm mời sẵn mấy game gợi ý', chu.includes('Gợi ý cho bạn'));
    kiem('mỗi dòng gợi ý có nút cài đặt',
      (await p.locator('a.nut-cai').count()) >= 3,
      `đếm được ${await p.locator('a.nut-cai').count()}`);

    const theLoai = await db.theLoai.findMany({
      orderBy: { thuTu: 'asc' }, take: 12, select: { ten: true, duongDan: true },
    });
    kiem('có lưới duyệt theo thể loại', chu.includes('Duyệt theo thể loại'));
    let duDuong = true;
    for (const t of theLoai) {
      if ((await p.locator(`a[href="/the-loai/${t.duongDan}"]`).count()) === 0) duDuong = false;
    }
    kiem('mỗi ô thể loại trỏ đúng gian của nó', duDuong);

    /*
     * HAI Ô CẠNH NHAU KHÔNG ĐƯỢC CÙNG MÀU.
     *
     * Đây chính là lỗi bản đầu mắc: màu băm từ đường dẫn nên lưới mười ô hoá
     * ra có bốn ô đỏ nằm liền kề, và màu hết làm được việc tách các ô ra. Nay
     * màu đếm theo chỗ đứng, nên canh luôn ở đây kẻo có ngày ai đó đổi lại.
     */
    const mau = await p.locator('a[href^="/the-loai/"]').evaluateAll(
      (o) => o.map((x) => x.style.backgroundImage));
    kiem('không ô thể loại nào trùng màu với ô liền trước',
      mau.length > 1 && mau.every((m, i) => i === 0 || m !== mau[i - 1]),
      mau.slice(0, 3).join(' | '));

    // ── Đầu trang game ────────────────────────────────────────────────
    const game = await db.game.findFirst({
      where: { trangThai: 'DANG_HIEN', gioiThieu: { not: null } },
      orderBy: { id: 'asc' },
      select: {
        duongDan: true, nhaPhatTrien: true,
        banTai: { select: { heMay: true, tep: { select: { id: true, loai: true } } } },
      },
    });
    if (!game) { kiem('có game mẫu để soi', false); return; }

    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

    const soHe = new Set(game.banTai.map((b) => b.heMay)).size;
    /* Bám `data-viec` chứ không bám lớp CSS: lớp của nút này đổi theo việc nó
       làm — tô đặc khi bấm là tải ngay, nhạt khi chỉ đưa xuống khung chọn. */
    const nutDau = p.locator('a[data-viec="tai-dau"]').first();
    kiem('đầu trang game có nút tải', (await nutDau.count()) > 0);
    const dich = await nutDau.getAttribute('href');
    if (soHe === 1) {
      kiem('game một hệ máy thì nút đầu trang đi thẳng tới trang tải',
        (dich ?? '').startsWith('/tai/'), `đang trỏ ${dich}`);
    } else {
      kiem('game nhiều hệ máy thì nút đầu trang đưa xuống khung chọn',
        dich === '#tai', `đang trỏ ${dich}`);
    }

    // ── Mô tả gấp lại, và hàng nhà phát triển ─────────────────────────
    kiem('mô tả dài thì gấp lại, có nút xem thêm',
      (await p.locator('button:has-text("xem thêm")').count()) > 0);
    await p.click('button:has-text("xem thêm")');
    kiem('bấm xem thêm thì đổi thành thu gọn',
      (await p.locator('button:has-text("Thu gọn")').count()) > 0);

    if (game.nhaPhatTrien) {
      kiem('có hàng nhà phát triển bấm được',
        (await p.locator(`a[href="/nha-phat-trien/${encodeURIComponent(game.nhaPhatTrien)}"]`)
          .filter({ hasText: 'Nhà phát triển' }).count()) > 0);
    }
  } finally {
    await p.close();
  }
}
