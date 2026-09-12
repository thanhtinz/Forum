import { GOC, db, moTrang, moTrangDaDangNhap, taoAnhPNG } from '../tro-giup.mjs';
import { doCoAnh } from '../../src/lib/co-anh.ts';
import { dungChuoiTim } from '../../src/lib/tim-kiem-const.ts';
import {
  ANH_TRONG_KET_QUA, ANH_CHUP_TOI_THIEU, ICON_TOI_THIEU, TOI_DA_ANH_CHUP,
} from '../../src/lib/luat-anh-const.ts';

const DUONG_DAN = 'game-kiem-luat-anh';

/**
 * LUẬT VỀ ẢNH, chép theo hướng dẫn tài sản của App Store.
 *
 * Ba luật, và cả ba đều thuộc loại hỏng mà không ai kêu: biểu tượng nhỏ quá
 * thì chỉ hơi nhoè, ảnh thứ mười một thì vẫn nằm im trong kho, ba tấm ra mặt
 * xếp sai thì trang kết quả chỉ kém hấp dẫn đi một chút. Không bài kiểm nào
 * canh thì mấy luật ấy lặng lẽ mục đi qua từng lượt sửa.
 */
export default async function chay(kiem) {
  const don = async () => { await db.game.deleteMany({ where: { duongDan: DUONG_DAN } }); };
  await don();

  let admin; let khach;
  try {
    /* ── Phép đo kích thước, đo thẳng trên ruột tệp ───────────────────── */
    kiem('đọc đúng cỡ tệp PNG',
      JSON.stringify(doCoAnh(new Uint8Array(taoAnhPNG(640, 480)), 'png')) === '{"rong":640,"cao":480}');
    kiem('tệp cụt thì trả về không biết, chứ không đoán bừa',
      doCoAnh(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'png') === null);

    const game = await db.game.create({
      data: {
        ten: 'Game kiểm luật ảnh', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(), gioiThieu: 'Trò chơi để kiểm luật ảnh.',
        // Cột tìm kiếm do lối nhập của quản trị dựng; tạo thẳng bằng Prisma thì
        // phải tự dựng, không thì game này không bao giờ ra ở trang tìm.
        timKiem: dungChuoiTim({ ten: 'Game kiểm luật ảnh' }),
      },
      select: { id: true },
    });

    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/`, { waitUntil: 'networkidle' });

    const gui = (cho, byte, ten) => admin.evaluate(async ([goc, cho, byte, ten]) => {
      const fd = new FormData();
      fd.set('cho', cho);
      fd.set('tep', new File([new Uint8Array(byte)], ten, { type: 'image/png' }));
      const r = await fetch(`${goc}/api/tai-anh`, { method: 'POST', body: fd });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, [GOC, cho, [...byte], ten]);

    /* ── Biểu tượng: đủ lớn, và vuông ─────────────────────────────────── */
    const nho = await gui('icon', taoAnhPNG(ICON_TOI_THIEU - 8, ICON_TOI_THIEU - 8), 'a.png');
    kiem('biểu tượng nhỏ hơn sàn thì bị từ chối', nho.ma === 422, `mã ${nho.ma}`);
    kiem('lời từ chối nói rõ thiếu bao nhiêu',
      (nho.than.loi ?? '').includes(String(ICON_TOI_THIEU)), nho.than.loi);

    const chuNhat = await gui('icon', taoAnhPNG(ICON_TOI_THIEU * 2, ICON_TOI_THIEU), 'a.png');
    kiem('biểu tượng không vuông thì bị từ chối', chuNhat.ma === 422, `mã ${chuNhat.ma}`);

    const vua = await gui('icon', taoAnhPNG(ICON_TOI_THIEU, ICON_TOI_THIEU), 'a.png');
    kiem('biểu tượng đủ lớn và vuông thì nhận', vua.ma === 200, `mã ${vua.ma} ${JSON.stringify(vua.than)}`);

    /* ── Ảnh chụp màn hình ────────────────────────────────────────────── */
    const chupNho = await gui('anh-chup', taoAnhPNG(ANH_CHUP_TOI_THIEU - 20, 600), 'a.png');
    kiem('ảnh chụp nhỏ hơn sàn thì bị từ chối', chupNho.ma === 422, `mã ${chupNho.ma}`);

    const chupVua = await gui('anh-chup', taoAnhPNG(ANH_CHUP_TOI_THIEU, 600), 'a.png');
    kiem('ảnh chụp đủ lớn thì nhận', chupVua.ma === 200, `mã ${chupVua.ma}`);

    /*
     * Ảnh trong bài diễn đàn KHÔNG chịu luật cỡ: luật tài sản là luật của hàng
     * bày, còn lời bình thì một tấm ảnh chụp lỗi bé tí vẫn nói đúng thứ cần nói.
     */
    const dienDan = await gui('dien-dan', taoAnhPNG(12, 12), 'a.png');
    kiem('ảnh diễn đàn bé tí vẫn được đăng', dienDan.ma === 200, `mã ${dienDan.ma}`);

    /* ── Trần mười ảnh một game ───────────────────────────────────────── */
    await db.anhChup.createMany({
      data: Array.from({ length: TOI_DA_ANH_CHUP }, (_, i) => ({
        gameId: game.id, duongDan: `/tep-mau/kiem-${i}.png`, thuTu: (i + 1) * 10,
      })),
    });
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    const chuQt = await admin.locator('body').textContent();
    kiem('đủ trần thì không còn biểu mẫu thêm ảnh',
      (await admin.locator('input[name="chuThich"]').count()) === 0);
    kiem('nói rõ đã đủ trần', chuQt.includes(`Đã đủ ${TOI_DA_ANH_CHUP} ảnh`), chuQt.slice(0, 200));
    kiem('có nhắc ba tấm đầu là ba tấm ra mặt',
      chuQt.includes(`${ANH_TRONG_KET_QUA} tấm đầu`));

    // Thêm một tấm nữa qua cơ sở dữ liệu rồi xem trang game có bày thừa không.
    await db.anhChup.create({
      data: { gameId: game.id, duongDan: '/tep-mau/kiem-thua.png', thuTu: 999 },
    });
    khach = await moTrang();
    await khach.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const soAnh = await khach.locator('.anh-chup-game').count();
    kiem('trang game không bày quá trần dù cơ sở dữ liệu có thừa',
      soAnh <= TOI_DA_ANH_CHUP, `đang bày ${soAnh}`);

    /* ── Kết quả tìm bày tối đa ba tấm ────────────────────────────────── */
    await khach.goto(`${GOC}/tim?q=${encodeURIComponent('kiểm luật ảnh')}`, { waitUntil: 'networkidle' });
    const soTrongKetQua = await khach.locator('.anh-chup-game').count();
    kiem('kết quả tìm bày ảnh chụp của game', soTrongKetQua > 0);
    kiem(`kết quả tìm bày nhiều nhất ${ANH_TRONG_KET_QUA} tấm mỗi game`,
      soTrongKetQua <= ANH_TRONG_KET_QUA, `đang bày ${soTrongKetQua}`);
  } finally {
    await don();
    for (const p of [admin, khach]) if (p) await p.close();
  }
}
