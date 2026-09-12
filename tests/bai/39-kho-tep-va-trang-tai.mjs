import { createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DUONG_DAN = 'game-kiem-kho-tep';

/*
 * Một tệp ZIP RỖNG thật (dấu "kết thúc thư mục trung tâm"), 22 byte.
 * JAR, APK và IPA đều là ZIP, nên dãy byte này hợp lệ với cả ba — đúng thứ cần
 * để thử phép soi ruột tệp mà không phải kéo tệp nào trên đĩa vào.
 */
const ZIP_THAT = [
  0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
/* Không phải ZIP, không phải gì cả — dùng để thử phép chặn sai loại. */
const RAC = [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x74, 0x68, 0x65, 0x20, 0x77, 0x6f];

/**
 * KHO TỆP GAME VÀ TRANG TẢI.
 *
 * Tệp game là món chính của cả cửa hàng này, nên cổng nhận tệp lên là chỗ nguy
 * hiểm nhất: nó nhận thứ nặng nhất, từ nhiều người nhất, rồi đưa lại cho người
 * khác CÀI LÊN MÁY HỌ. Nửa đầu bài kiểm đúng ba câu hỏi ấy — ai gọi được, gọi
 * được vào bản của ai, và gửi được ruột tệp kiểu gì.
 */
export default async function chay(kiem) {
  /*
   * Dọn cả TỆP TRONG KHO, không chỉ hàng trong bảng.
   *
   * Xoá game thì hàng `TepTai` đi theo dây `onDelete: Cascade`, nhưng tệp nằm
   * trên đĩa thì cascade không với tới — mỗi lượt chạy bài này để lại một tệp
   * nữa trong `tai-len/tep`, và sau vài trăm lượt thì thư mục ấy thành bãi rác.
   */
  const don = async () => {
    const tep = await db.tepTai.findMany({
      where: { ban: { game: { duongDan: DUONG_DAN } } }, select: { duongDan: true },
    });
    for (const t of tep) {
      if (!t.duongDan.startsWith('/api/tep/')) continue;
      await unlink(join(process.cwd(), 'tai-len', t.duongDan.slice('/api/tep/'.length)))
        .catch(() => {});
    }
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
  };
  await don();

  let admin; let thuong; let khach;
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm kho tệp', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: { create: { heMay: 'JAVA', soHieu: '1.0', moiNhat: true } },
      },
      select: { id: true, banTai: { select: { id: true } } },
    });
    const banId = game.banTai[0].id;

    /** Gửi một tệp lên cổng, chạy trong trình duyệt để mang theo cookie phiên. */
    const gui = (p, banId, loai, byte, ten) =>
      p.evaluate(async ([goc, banId, loai, byte, ten]) => {
        const r = await fetch(
          `${goc}/api/tai-len-tep?banId=${banId}&loai=${loai}&ten=${encodeURIComponent(ten)}`,
          { method: 'POST', body: new Uint8Array(byte) },
        );
        return { ma: r.status, than: await r.json().catch(() => ({})) };
      }, [GOC, banId, loai, byte, ten]);

    // ── Ai gọi được ───────────────────────────────────────────────────
    khach = await moTrang();
    await khach.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const rKhach = await gui(khach, banId, 'JAR', ZIP_THAT, 'a.jar');
    kiem('khách chưa đăng nhập không tải tệp game lên được', rKhach.ma === 401, `mã ${rKhach.ma}`);

    thuong = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await thuong.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const rThuong = await gui(thuong, banId, 'JAR', ZIP_THAT, 'a.jar');
    kiem('thành viên thường không gắn được tệp vào bản của người khác',
      rThuong.ma === 404, `mã ${rThuong.ma}`);
    kiem('lượt gửi bị chặn KHÔNG để lại tệp nào',
      (await db.tepTai.count({ where: { banId } })) === 0);

    // ── Gửi được ruột tệp kiểu gì ─────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/`, { waitUntil: 'networkidle' });

    const rRac = await gui(admin, banId, 'JAR', RAC, 'a.jar');
    kiem('tệp không phải JAR thì bị chặn dù tên là .jar', rRac.ma === 415, `mã ${rRac.ma}`);
    kiem('tệp bị chặn KHÔNG được ghi vào bản',
      (await db.tepTai.count({ where: { banId } })) === 0);

    const rSaiHe = await gui(admin, banId, 'EXE', ZIP_THAT, 'a.exe');
    kiem('hệ Java không nhận tệp EXE', rSaiHe.ma === 400, `mã ${rSaiHe.ma}`);

    const rRong = await gui(admin, banId, 'JAR', [], 'a.jar');
    kiem('tệp rỗng thì bị chặn', rRong.ma === 411 || rRong.ma === 400, `mã ${rRong.ma}`);

    // ── Lượt gửi hợp lệ ───────────────────────────────────────────────
    const rOk = await gui(admin, banId, 'JAR', ZIP_THAT, 'tro-choi.jar');
    kiem('quản trị tải được tệp JAR lên', rOk.ma === 200, `mã ${rOk.ma} ${JSON.stringify(rOk.than)}`);

    const tep = await db.tepTai.findFirst({ where: { banId }, select: {
      id: true, duongDan: true, dungLuong: true, maKiemTra: true, tenTep: true } });
    kiem('tệp được ghi vào bản tải', !!tep);

    /*
     * DUNG LƯỢNG VÀ MÃ BĂM DO MÁY CHỦ TỰ ĐO.
     *
     * Đây là cả lý do cổng này tồn tại: lối cũ bắt người bày hàng gõ tay mã
     * sha256 vào một ô nhập, nên mã ấy có thể là mã của một tệp khác, hoặc gõ
     * nhầm một ký tự. Tính lại ở đây bằng đúng dãy byte vừa gửi đi thì biết
     * chắc máy chủ không bịa.
     */
    const bam = createHash('sha256').update(Buffer.from(ZIP_THAT)).digest('hex');
    kiem('máy chủ tự đo đúng dung lượng',
      tep && Number(tep.dungLuong) === ZIP_THAT.length, String(tep?.dungLuong));
    kiem('máy chủ tự băm đúng mã sha256', tep?.maKiemTra === bam, `${tep?.maKiemTra} ≠ ${bam}`);
    kiem('dung lượng của bản cộng lại theo tệp',
      Number((await db.banTai.findUnique({ where: { id: banId }, select: { dungLuong: true } })).dungLuong)
        === ZIP_THAT.length);

    // ── Tệp lấy lại được, và đúng từng byte ───────────────────────────
    const rLay = await khach.request.get(`${GOC}${tep.duongDan}`);
    kiem('tệp trong kho lấy về được', rLay.status() === 200, `mã ${rLay.status()}`);
    const veTay = await rLay.body();
    kiem('tệp về đúng từng byte', Buffer.compare(veTay, Buffer.from(ZIP_THAT)) === 0);

    // Cổng phát tệp không được thành lối đọc trộm đĩa máy chủ.
    const rTron = await khach.request.get(`${GOC}/api/tep/..%2f..%2fetc/passwd`);
    kiem('không leo ra khỏi thư mục kho được', rTron.status() === 404, `mã ${rTron.status()}`);
    const rSaiDuoi = await khach.request.get(`${GOC}/api/tep/tep/khong-co-that.txt`);
    kiem('cổng tệp không phát thứ ngoài tám loại tệp cài đặt',
      rSaiDuoi.status() === 404, `mã ${rSaiDuoi.status()}`);

    // ── TRANG TẢI ─────────────────────────────────────────────────────
    await khach.goto(`${GOC}/tai/${tep.id}`, { waitUntil: 'networkidle' });
    const chu = await khach.locator('body').textContent();
    kiem('trang tải nói rõ đang tải game nào', chu.includes('Game kiểm kho tệp'));
    kiem('trang tải nói rõ bản nào', chu.includes('1.0'));
    kiem('trang tải có thanh tiến trình',
      (await khach.locator('[role="progressbar"]').count()) > 0
      || (await khach.locator('text=Đã tải xong').count()) > 0, chu.slice(0, 300));
    kiem('trang tải có hai tab',
      (await khach.locator('[role="tab"]').count()) === 2);

    /*
     * TRANG TẢI CHỈ LÀM MỘT VIỆC.
     *
     * Bản đầu bày thêm mã sha256, cách cài trên từng hệ máy và một kệ game gợi
     * ý. Ba thứ ấy đều đúng chỗ ở TRANG GAME; ở đây chúng biến một màn hình
     * chỉ cần trả lời "xong chưa" thành một trang phải cuộn. Canh lại kẻo có
     * ngày ai đó thấy trống mà nhét vào.
     */
    for (const thua of [bam, 'Cách cài', 'Trong lúc chờ']) {
      kiem(`trang tải không bày “${thua.slice(0, 12)}”`, !chu.includes(thua));
    }

    // Nút tải ở trang game phải dẫn SANG TRANG TẢI, không bắn thẳng vào tệp.
    await khach.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    kiem('nút tải ở trang game dẫn sang trang tải',
      (await khach.locator(`a[href="/tai/${tep.id}"]`).count()) > 0);

    // ── Dòng tệp có ghi sổ lượt tải không ─────────────────────────────
    const truoc = (await db.game.findUnique({
      where: { id: game.id }, select: { soLuotTai: true } })).soLuotTai;
    const rDong = await khach.request.get(`${GOC}/api/tai/${tep.id}/dong`);
    kiem('cổng dòng trả về đúng tệp', rDong.status() === 200
      && Buffer.compare(await rDong.body(), Buffer.from(ZIP_THAT)) === 0, `mã ${rDong.status()}`);
    kiem('cổng dòng đặt tên tệp đọc được cho người tải',
      (rDong.headers()['content-disposition'] ?? '').includes('tro-choi.jar'),
      rDong.headers()['content-disposition']);
    kiem('tải qua dòng cũng cộng lượt tải', await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { soLuotTai: true } })).soLuotTai > truoc));

    // ── Game chưa bày ra cửa hàng thì không lối nào tải được ───────────
    await db.game.update({ where: { id: game.id }, data: { trangThai: 'NHAP' } });
    const rAn = await khach.request.get(`${GOC}/api/tai/${tep.id}/dong`);
    kiem('tệp của game chưa bày ra thì cổng dòng chặn', rAn.status() === 404, `mã ${rAn.status()}`);
    const rTrangAn = await khach.request.get(`${GOC}/tai/${tep.id}`);
    kiem('trang tải của game chưa bày ra trả 404', rTrangAn.status() === 404, `mã ${rTrangAn.status()}`);
  } finally {
    await don();
    for (const p of [admin, thuong, khach]) if (p) await p.close();
  }
}
