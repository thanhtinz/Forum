import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  GOC, db, moTrang, moTrangDaDangNhap, taoAnhPNG, taoMP4, tuDongXacNhan,
} from '../tro-giup.mjs';
import { PHIM_TOI_DA } from '../../src/lib/phim-const.ts';

const DUONG_DAN = 'game-kiem-phim';

/**
 * ĐOẠN PHIM XEM TRƯỚC — "app preview" của App Store.
 *
 * Phim là thứ NẶNG nhất cửa hàng này nhận vào, nên cổng nhận nó là chỗ nguy
 * hiểm nhất: ai gọi được, gọi được vào game của ai, gửi được ruột tệp kiểu gì,
 * và bao nhiêu đoạn.
 *
 * Nửa sau bài kiểm canh phép phát THEO KHÚC (`Range`). Không có nó thì Safari
 * không phát, chỉ hiện một ô đen — mà lỗi ấy không lộ ra ở máy bàn Chrome, tức
 * là không lộ ra ở chỗ người viết mã đang nhìn.
 */
export default async function chay(kiem) {
  const don = async () => {
    const phim = await db.phimGame.findMany({
      where: { game: { duongDan: DUONG_DAN } }, select: { duongDan: true },
    });
    for (const f of phim) {
      if (!f.duongDan.startsWith('/api/phim/')) continue;
      await unlink(join(process.cwd(), 'tai-len', f.duongDan.slice('/api/phim/'.length)))
        .catch(() => {});
    }
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
  };
  await don();

  let khach; let thuong; let admin;
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm phim', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        anhChup: { create: { duongDan: '/tep-mau/anh-kiem.png', thuTu: 10 } },
      },
      select: { id: true },
    });

    const gui = (p, gameId, byte) => p.evaluate(async ([goc, gameId, byte]) => {
      const r = await fetch(`${goc}/api/tai-len-phim?gameId=${gameId}`, {
        method: 'POST', body: new Uint8Array(byte),
      });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, [GOC, gameId, byte]);

    const PHIM = [...taoMP4(3000)];
    const RAC = [...Buffer.from('day khong phai mp4 dau nhe, that day'.repeat(4))];

    // ── Ai gọi được ───────────────────────────────────────────────────
    khach = await moTrang();
    await khach.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const rKhach = await gui(khach, game.id, PHIM);
    kiem('khách chưa đăng nhập không tải phim lên được', rKhach.ma === 401, `mã ${rKhach.ma}`);

    thuong = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await thuong.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const rThuong = await gui(thuong, game.id, PHIM);
    kiem('thành viên thường không gắn được phim vào game của người khác',
      rThuong.ma === 403 || rThuong.ma === 404, `mã ${rThuong.ma}`);
    kiem('lượt gửi bị chặn KHÔNG để lại đoạn nào',
      (await db.phimGame.count({ where: { gameId: game.id } })) === 0);

    // ── Ruột tệp phải là MP4 thật ─────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/`, { waitUntil: 'networkidle' });

    const rRac = await gui(admin, game.id, RAC);
    kiem('tệp không phải MP4 thì bị chặn', rRac.ma === 415, `mã ${rRac.ma}`);
    kiem('tệp bị chặn KHÔNG được ghi vào game',
      (await db.phimGame.count({ where: { gameId: game.id } })) === 0);

    const rRong = await gui(admin, game.id, []);
    kiem('tệp rỗng thì bị chặn', rRong.ma === 411 || rRong.ma === 400, `mã ${rRong.ma}`);

    // ── Lượt gửi hợp lệ ───────────────────────────────────────────────
    const rOk = await gui(admin, game.id, PHIM);
    kiem('quản trị tải được đoạn phim lên', rOk.ma === 200, `mã ${rOk.ma} ${JSON.stringify(rOk.than)}`);

    const phim = await db.phimGame.findFirst({
      where: { gameId: game.id }, select: { id: true, duongDan: true, dungLuong: true },
    });
    kiem('đoạn phim được ghi vào game', !!phim);
    kiem('máy chủ tự đo đúng dung lượng',
      phim && Number(phim.dungLuong) === PHIM.length, String(phim?.dungLuong));

    // ── Phát cả tệp, và phát THEO KHÚC ────────────────────────────────
    const rCa = await khach.request.get(`${GOC}${phim.duongDan}`);
    kiem('lấy cả đoạn phim về được', rCa.status() === 200, `mã ${rCa.status()}`);
    kiem('phim khai đúng kiểu MP4',
      (rCa.headers()['content-type'] ?? '').includes('video/mp4'), rCa.headers()['content-type']);
    kiem('phim nói rõ mình nhận yêu cầu theo khúc',
      rCa.headers()['accept-ranges'] === 'bytes', rCa.headers()['accept-ranges']);
    kiem('đoạn phim về đúng từng byte',
      Buffer.compare(await rCa.body(), Buffer.from(PHIM)) === 0);

    const rKhuc = await khach.request.get(`${GOC}${phim.duongDan}`, {
      headers: { Range: 'bytes=0-99' },
    });
    kiem('xin một khúc thì trả về 206', rKhuc.status() === 206, `mã ${rKhuc.status()}`);
    kiem('khúc trả về đúng một trăm byte', (await rKhuc.body()).length === 100);
    kiem('nói rõ khúc ấy nằm đâu trong tệp',
      rKhuc.headers()['content-range'] === `bytes 0-99/${PHIM.length}`,
      rKhuc.headers()['content-range']);

    const rCuoi = await khach.request.get(`${GOC}${phim.duongDan}`, {
      headers: { Range: 'bytes=-50' },
    });
    kiem('xin năm mươi byte cuối cũng ra đúng năm mươi byte',
      rCuoi.status() === 206 && (await rCuoi.body()).length === 50, `mã ${rCuoi.status()}`);

    const rQua = await khach.request.get(`${GOC}${phim.duongDan}`, {
      headers: { Range: `bytes=${PHIM.length + 10}-` },
    });
    kiem('xin quá mép tệp thì trả 416 kèm cỡ thật',
      rQua.status() === 416 && (rQua.headers()['content-range'] ?? '').endsWith(`/${PHIM.length}`),
      `mã ${rQua.status()} ${rQua.headers()['content-range']}`);

    // ── Trang game: phim đứng TRƯỚC ảnh ───────────────────────────────
    await khach.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const o = await khach.locator('video').first();
    kiem('trang game có thẻ phim', (await o.count()) > 0);
    const thuoc = await o.evaluate((x) => ({
      src: x.getAttribute('src'), im: x.muted, lap: x.loop, trongDong: x.playsInline,
    }));
    kiem('phim trỏ đúng tệp trong kho', thuoc.src === phim.duongDan, String(thuoc.src));
    kiem('phim chạy không tiếng — bật tiếng sẵn là trình duyệt chặn tự chạy', thuoc.im === true);
    kiem('phim chạy lặp', thuoc.lap === true);
    kiem('phim chạy TRONG dòng, không giành toàn màn hình của iPhone',
      thuoc.trongDong === true);
    const truoc = await khach.evaluate(() => {
      const v = document.querySelector('video');
      const a = document.querySelector('.anh-chup-game');
      if (!v || !a) return null;
      return !!(v.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    kiem('phim đứng trước ảnh chụp trong dải xem trước', truoc === true, String(truoc));

    /*
     * ── ẢNH BÌA CỦA ĐOẠN PHIM ─────────────────────────────────────────
     *
     * Cột `anhBia` từng nằm trong lược đồ mà không nơi nào ghi vào — tức là
     * một cột chết, và phim mở màn bằng khung đầu của chính nó: với phim game
     * thì khung đầu gần như luôn là màn hình đen lúc trò đang nạp.
     */
    const guiBia = (p, cho, byte) => p.evaluate(async ([goc, cho, byte]) => {
      const fd = new FormData();
      fd.set('cho', cho);
      fd.set('tep', new File([new Uint8Array(byte)], 'bia.png', { type: 'image/png' }));
      const r = await fetch(`${goc}/api/tai-anh`, { method: 'POST', body: fd });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, [GOC, cho, byte]);

    const biaNho = await guiBia(admin, 'phim-bia', [...taoAnhPNG(100, 180)]);
    kiem('ảnh bìa phim nhỏ hơn sàn thì bị từ chối', biaNho.ma === 422, `mã ${biaNho.ma}`);

    // Đủ lớn, và KHÔNG đòi nằm ngang: phim game điện thoại phần lớn dựng đứng.
    const biaVua = await guiBia(admin, 'phim-bia', [...taoAnhPNG(360, 640)]);
    kiem('ảnh bìa phim dựng đứng mà đủ lớn thì nhận', biaVua.ma === 200, `mã ${biaVua.ma}`);

    await db.phimGame.update({
      where: { id: phim.id }, data: { anhBia: biaVua.than.duongDan },
    });
    await khach.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    kiem('trang game dùng ảnh bìa ấy làm tấm mở màn của phim',
      (await khach.locator(`video[poster="${biaVua.than.duongDan}"]`).count()) > 0);

    // ── Trần ba đoạn ──────────────────────────────────────────────────
    await db.phimGame.createMany({
      data: Array.from({ length: PHIM_TOI_DA - 1 }, (_, i) => ({
        gameId: game.id, duongDan: `/api/phim/phim/khong-co-that-${i}.mp4`, thuTu: 100 + i,
      })),
    });
    const rDay = await gui(admin, game.id, PHIM);
    kiem(`quá ${PHIM_TOI_DA} đoạn thì bị chặn`, rDay.ma === 409, `mã ${rDay.ma}`);

    // ── Gỡ một đoạn thì tệp cũng đi theo ──────────────────────────────
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.locator('button:has-text("Gỡ")').first().click();
    const daGo = await (async () => {
      for (let i = 0; i < 30; i++) {
        if (!(await db.phimGame.findUnique({ where: { id: phim.id } }))) return true;
        await new Promise((x) => setTimeout(x, 500));
      }
      return false;
    })();
    kiem('quản trị gỡ được đoạn phim', daGo);
    if (daGo) {
      const conSong = await khach.request.get(`${GOC}${phim.duongDan}`);
      kiem('gỡ đoạn phim thì tệp trong kho cũng mất',
        conSong.status() === 404, `mã ${conSong.status()}`);
    }
  } finally {
    await don();
    for (const p of [khach, thuong, admin]) if (p) await p.close();
  }
}
