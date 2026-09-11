import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Sửa bản tải, quản lý từng tệp, và đổi trạng thái nhiều game một lượt.
 *
 * Hai điều đáng canh nhất:
 *   1. `BanTai.dungLuong` phải luôn bằng TỔNG dung lượng các tệp của nó. Con
 *      số ấy in ở trang game ngay cạnh nút tải, nên lệch là người tải thấy
 *      "14 KB" rồi nhận về một tệp nặng gấp mười.
 *   2. Chỉ MỘT bản mỗi hệ được mang cờ `moiNhat`. Hai bản cùng cờ thì trang
 *      game chọn bừa, và lỗi hiện ra lúc này lúc khác.
 */
export default async function chay(kiem) {
  const TEN = 'Game kiểm bản tải';
  await don(TEN);

  let admin;
  try {
    const game = await db.game.create({
      data: {
        ten: TEN, duongDan: 'game-kiem-ban-tai', trangThai: 'NHAP',
        banTai: {
          create: [
            { heMay: 'JAVA', soHieu: '1.0', moiNhat: true },
            { heMay: 'JAVA', soHieu: '2.0', moiNhat: false },
          ],
        },
      },
      select: { id: true },
    });

    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });

    // ── Mở bản 1.0 ra sửa ──────────────────────────────────────────────
    await admin.click('button[aria-label="Mở bản Java ME 1.0"]');
    kiem('mở bản ra thì hiện biểu mẫu sửa',
      (await admin.locator('button:has-text("Lưu bản này")').count()) > 0);

    await admin.fill('input[name="soHieu"]', '1.0.1');
    await admin.fill('textarea[name="doiMoi"]', 'Vá lỗi treo ở màn hai.');
    await admin.click('button:has-text("Lưu bản này")');

    const daSua = await doiToi(async () => {
      const b = await db.banTai.findFirst({
        where: { gameId: game.id, soHieu: '1.0.1' }, select: { doiMoi: true },
      });
      return b?.doiMoi === 'Vá lỗi treo ở màn hai.';
    });
    kiem('sửa được số hiệu và phần "có gì mới"', daSua);

    // ── Số hiệu trùng với bản khác cùng hệ thì bị chặn ─────────────────
    await admin.fill('input[name="soHieu"]', '2.0');
    await admin.click('button:has-text("Lưu bản này")');
    await admin.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => {});
    const conNguyen = await db.banTai.count({ where: { gameId: game.id, soHieu: '1.0.1' } });
    kiem('số hiệu trùng bản khác cùng hệ thì bị chặn', conNguyen === 1);

    // ── Gắn tệp: dung lượng phải ĐO TỪ TỆP THẬT ───────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click('button[aria-label="Mở bản Java ME 1.0.1"]');

    const tepThat = await db.tepTai.findFirst({
      where: { duongDan: { startsWith: '/tep-mau/' }, dungLuong: { not: null } },
      select: { duongDan: true, dungLuong: true },
    });
    if (!tepThat) { kiem('có tệp mẫu để đo', false); return; }

    /*
     * Bám vào `aria-label` chứ không vào chữ trên nút.
     *
     * Dòng tóm tắt của bản ghi "Chưa gắn tệp", nên `has-text("Gắn tệp")` khớp
     * luôn cái nút gấp/mở của bản — `has-text` dò theo chuỗi con và không phân
     * biệt hoa thường. Bài kiểm bấm nhầm vào đó, gập panel lại, rồi báo hỏng
     * vì một lẽ chẳng liên quan gì tới thứ nó định canh.
     */
    await admin.fill('input[name="duongDanTep"]', tepThat.duongDan);
    await admin.click(`button[aria-label="Gắn tệp vào bản 1.0.1"]`);

    const daGan = await doiToi(async () =>
      (await db.tepTai.count({ where: { ban: { gameId: game.id }, duongDan: tepThat.duongDan } })) === 1);
    kiem('gắn được tệp vào bản đã có', daGan);

    const tepMoi = await db.tepTai.findFirst({
      where: { ban: { gameId: game.id } }, select: { id: true, dungLuong: true },
    });
    kiem('dung lượng tệp đo từ tệp thật, không phải gõ tay',
      tepMoi?.dungLuong === tepThat.dungLuong,
      `đo được ${tepMoi?.dungLuong}, tệp thật ${tepThat.dungLuong}`);

    const ban = await db.banTai.findFirst({
      where: { gameId: game.id, soHieu: '1.0.1' }, select: { dungLuong: true },
    });
    kiem('dung lượng bản bằng tổng dung lượng tệp',
      ban?.dungLuong === tepThat.dungLuong, `bản ${ban?.dungLuong}`);

    // ── Gỡ tệp thì dung lượng bản về trống, không về 0 ─────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click('button[aria-label="Mở bản Java ME 1.0.1"]');
    admin.once('dialog', (d) => d.accept());
    await admin.click(`button[aria-label^="Gỡ tệp"]`);

    const daGo = await doiToi(async () =>
      (await db.tepTai.count({ where: { id: tepMoi.id } })) === 0);
    kiem('gỡ được tệp khỏi bản', daGo);

    const banSau = await db.banTai.findFirst({
      where: { gameId: game.id, soHieu: '1.0.1' }, select: { dungLuong: true },
    });
    kiem('hết tệp thì dung lượng bản để TRỐNG, không phải 0',
      banSau?.dungLuong === null, `còn ${banSau?.dungLuong}`);

    // ── Đặt bản mới nhất: mỗi hệ đúng một cờ ──────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.click('button:has-text("Đặt mới nhất")');

    const daDoi = await doiToi(async () => {
      const b = await db.banTai.findFirst({
        where: { gameId: game.id, soHieu: '2.0' }, select: { moiNhat: true },
      });
      return b?.moiNhat === true;
    });
    kiem('đặt được bản khác làm mới nhất', daDoi);

    const soCo = await db.banTai.count({ where: { gameId: game.id, heMay: 'JAVA', moiNhat: true } });
    kiem('mỗi hệ máy chỉ còn đúng MỘT bản mang cờ mới nhất', soCo === 1, `đếm được ${soCo}`);

    /*
     * ĐĂNG MỘT GAME — mục này canh một lỗi đã nằm im suốt từ đầu.
     *
     * `doiTrangThai` từng ghi `dangLuc: { set: undefined }` với ý "để nguyên
     * cột ấy". Prisma đòi DateTime hoặc null, gặp object là ném lỗi, nên mọi
     * lần bấm Đăng từ khu quản trị đều hỏng. Không ai gặp vì kịch bản gieo dữ
     * liệu tự đặt `dangLuc` lấy, và không bài kiểm nào từng bấm cái nút ấy.
     */
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.click('button:has-text("Đăng")');
    const motDaDang = await doiToi(async () => {
      const g = await db.game.findUnique({
        where: { id: game.id }, select: { trangThai: true, dangLuc: true },
      });
      return g?.trangThai === 'DANG_HIEN' && g?.dangLuc != null;
    });
    kiem('bấm Đăng ở trang sửa game thì game lên kho và có ngày đăng', motDaDang);

    // Đăng lại sau khi rút về nháp KHÔNG được đặt lại ngày đăng.
    const ngayDau = (await db.game.findUnique({
      where: { id: game.id }, select: { dangLuc: true },
    })).dangLuc;
    await db.game.update({ where: { id: game.id }, data: { trangThai: 'NHAP' } });
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click('button:has-text("Đăng")');
    await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { trangThai: true } }))?.trangThai === 'DANG_HIEN');
    const ngaySau = (await db.game.findUnique({
      where: { id: game.id }, select: { dangLuc: true },
    })).dangLuc;
    kiem('đăng lại không đặt lại ngày đăng',
      ngayDau?.getTime() === ngaySau?.getTime(), `${ngayDau} → ${ngaySau}`);

    await db.game.update({ where: { id: game.id }, data: { trangThai: 'NHAP' } });

    // ── Đổi trạng thái hàng loạt ───────────────────────────────────────
    const game2 = await db.game.create({
      data: { ten: `${TEN} hai`, duongDan: 'game-kiem-ban-tai-hai', trangThai: 'NHAP' },
      select: { id: true },
    });

    await admin.goto(`${GOC}/quan-tri/game?trangThai=NHAP`, { waitUntil: 'networkidle' });
    await admin.click('input[aria-label="Chọn hết game trên trang này"]');
    kiem('thanh việc hiện ra khi đã chọn',
      (await admin.locator('button:has-text("Rút về nháp")').count()) > 0);

    admin.once('dialog', (d) => d.accept());
    await admin.click('button:has-text("Đăng")');

    const daDang = await doiToi(async () =>
      (await db.game.count({ where: { id: { in: [game.id, game2.id] }, trangThai: 'DANG_HIEN' } })) === 2);
    kiem('đăng được nhiều game một lượt', daDang);

    // Ngày đăng phải được đặt — đó là luật nằm trong `doiTrangThai`, và mục
    // này canh đúng việc thao tác hàng loạt vẫn đi qua luật ấy.
    const co = await db.game.count({
      where: { id: { in: [game.id, game2.id] }, dangLuc: { not: null } },
    });
    kiem('đăng hàng loạt vẫn đặt ngày đăng cho từng game', co === 2, `chỉ ${co} game có ngày`);
  } finally {
    await don(TEN);
    await admin?.close();
  }
}

async function don(ten) {
  await db.game.deleteMany({ where: { ten: { startsWith: ten } } });
}
