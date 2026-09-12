import { GOC, db, moTrang, moTrangDaDangNhap, taoAnhPNG } from '../tro-giup.mjs';
import { ICON_TOI_THIEU } from '../../src/lib/luat-anh-const.ts';

const DUONG_DAN = 'game-kiem-tai-anh';

/*
 * Một tấm PNG 1×1 thật, dựng bằng tay để khỏi phụ thuộc tệp nào trên đĩa.
 *
 * Chỉ còn dùng được cho ảnh DIỄN ĐÀN và cho mấy phép kiểm về ruột tệp: ảnh của
 * cửa hàng nay phải đủ lớn mới nhận (xem bài 41), nên chỗ nào cần một tấm hợp
 * lệ thì gọi `taoAnhPNG` dựng đúng cỡ.
 */
const PNG_THAT = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

/** Tấm biểu tượng hợp luật: vuông và đủ điểm ảnh. */
const ICON_THAT = taoAnhPNG(ICON_TOI_THIEU, ICON_TOI_THIEU);

/*
 * TẢI ẢNH LÊN — thay cho lối dán địa chỉ.
 *
 * Cổng `/api/tai-anh` là một địa chỉ POST công khai nhận TỆP, tức là thứ nguy
 * hiểm nhất trong cả cửa hàng này. Ba mục kiểm đầu bài mới là lý do bài kiểm
 * tồn tại: ai gọi được, gọi được cái gì, và cỡ bao nhiêu.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
    await db.lanHong.deleteMany({ where: { khoa: { startsWith: 'anh:' } } });
  };
  await don();

  let admin;
  try {
    const game = await db.game.create({
      data: { ten: 'Game kiểm tải ảnh', duongDan: DUONG_DAN, trangThai: 'DANG_HIEN', dangLuc: new Date() },
      select: { id: true },
    });

    /** Gửi một tệp lên cổng, chạy trong trình duyệt để mang theo cookie phiên. */
    const gui = (p, cho, byte, ten, kieu) => p.evaluate(async ([goc, cho, byte, ten, kieu]) => {
      const fd = new FormData();
      fd.set('cho', cho);
      fd.set('tep', new File([new Uint8Array(byte)], ten, { type: kieu }));
      const r = await fetch(`${goc}/api/tai-anh`, { method: 'POST', body: fd });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, [GOC, cho, byte, ten, kieu]);

    // ── Khách chưa đăng nhập thì không gửi được gì ─────────────────────
    const khach = await moTrang();
    await khach.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const rKhach = await gui(khach, 'dien-dan', PNG_THAT, 'a.png', 'image/png');
    kiem('khách chưa đăng nhập không tải ảnh lên được', rKhach.ma === 401, `mã ${rKhach.ma}`);
    await khach.close();

    // ── Thành viên thường không đụng được chỗ của cửa hàng ─────────────
    const thuong = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await thuong.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const rThuong = await gui(thuong, 'icon', [...ICON_THAT], 'a.png', 'image/png');
    kiem('thành viên thường không đặt được ảnh biểu tượng', rThuong.ma === 403, `mã ${rThuong.ma}`);

    // Nhưng ảnh cho diễn đàn thì được.
    const rDienDan = await gui(thuong, 'dien-dan', PNG_THAT, 'a.png', 'image/png');
    kiem('thành viên thường tải được ảnh cho diễn đàn',
      rDienDan.ma === 200 && !!rDienDan.than.duongDan, JSON.stringify(rDienDan.than));
    await thuong.close();

    /*
     * ── NHÌN VÀO RUỘT TỆP, KHÔNG TIN CÁI NHÃN ────────────────────────
     *
     * Mục kiểm quan trọng nhất. `Content-Type` và đuôi tệp đều do phía gửi
     * đặt, nên cả hai bịa được. Một tệp tên `.png`, nhãn `image/png`, mà ruột
     * là kịch bản shell thì phải trượt — đó đúng là thứ ta không muốn nằm
     * trong một thùng công khai.
     */
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/`, { waitUntil: 'networkidle' });

    const kichBan = [...'#!/bin/sh\necho xin chao\n'].map((c) => c.charCodeAt(0));
    const rGia = await gui(admin, 'icon', kichBan, 'anh-that.png', 'image/png');
    kiem('tệp giả danh ảnh PNG bị chặn', rGia.ma === 415, `mã ${rGia.ma}`);

    // Tệp rỗng cũng không phải ảnh.
    const rRong = await gui(admin, 'icon', [], 'rong.png', 'image/png');
    kiem('tệp rỗng bị chặn', rRong.ma === 400, `mã ${rRong.ma}`);

    // Quá cỡ thì chặn TRƯỚC khi đọc vào bộ nhớ.
    const to = new Array(600 * 1024).fill(0x41);
    const rTo = await gui(admin, 'icon', [...ICON_THAT, ...to], 'to.png', 'image/png');
    kiem('ảnh nặng quá mức cho phép bị chặn', rTo.ma === 413, `mã ${rTo.ma}`);

    // ── Ảnh thật thì lưu được, và đọc lại được ─────────────────────────
    const rThat = await gui(admin, 'icon', [...ICON_THAT], 'bieu-tuong.png', 'image/png');
    kiem('ảnh PNG thật thì lưu được', rThat.ma === 200 && !!rThat.than.duongDan,
      JSON.stringify(rThat.than));

    const dia = rThat.than.duongDan;
    /*
     * TÊN TỆP DO MÁY CHỦ ĐẶT, không lấy tên người gửi: tên người gửi mang được
     * dấu chấm, dấu gạch chéo và ký tự lạ — đủ đường để ghi đè ảnh người khác
     * hoặc thoát ra khỏi thư mục.
     */
    kiem('tên tệp lưu xuống KHÔNG lấy theo tên người gửi',
      !!dia && !dia.includes('bieu-tuong'), dia ?? '');

    const rXem = await admin.evaluate(async (d) => (await fetch(d)).status, dia);
    kiem('ảnh vừa lưu mở lại được', rXem === 200, `mã ${rXem}`);

    // ── Gắn vào game rồi xoá game thì tệp cũng đi theo ─────────────────
    await db.game.update({ where: { id: game.id }, data: { icon: dia } });
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    kiem('trang quản trị bày ảnh biểu tượng đã tải lên',
      (await admin.locator(`img[src="${dia}"]`).count()) > 0);

    await db.game.delete({ where: { id: game.id } });
    // Xoá game bằng Prisma thẳng thì không chạy qua `xoaGame`, nên tệp vẫn còn
    // — mục này chỉ khẳng định ảnh không bị gỡ oan lúc chưa ai bảo gỡ.
    const conSong = await admin.evaluate(async (d) => (await fetch(d)).status, dia);
    kiem('ảnh không tự biến mất khi chưa ai gỡ', conSong === 200, `mã ${conSong}`);
  } finally {
    if (admin) await admin.close();
    await don();
  }
}
