import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { tomTatDanhGia, cumHayNhac } from '../../src/lib/tom-tat-danh-gia.ts';

const DUONG_DAN = 'kiemthu-huu-ich';
const TEN = 'kiemthu-hi';

/**
 * TIÊU ĐỀ BÀI ĐÁNH GIÁ, PHIẾU "HỮU ÍCH" VÀ ĐOẠN TÓM TẮT.
 *
 * Ba thứ này đi cùng nhau vì chúng làm nên một việc: quyết định NĂM BÀI NÀO
 * được lên kệ. Bài nhiều phiếu đứng trước, tiêu đề là thứ đọc được trong một
 * giây, còn đoạn tóm tắt nói gọn cả đống bài còn lại.
 *
 * Chỗ dễ sai nhất là phiếu hữu ích: nó là một endpoint POST công khai đổi được
 * thứ tự kệ, nên bấm hai lần phải là BỎ phiếu chứ không phải cộng hai, và bấm
 * cho bài của chính mình thì phải chặn ở máy chủ — chặn ở giao diện thì ai
 * cũng phát lại được yêu cầu.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: TEN } } });
  };
  await don();

  let p; let khac;
  try {
    /* ── Phần thuần: đếm cụm và dựng câu, không cần trình duyệt ──────── */
    kiem('dưới ngưỡng bài thì không tóm tắt gì',
      tomTatDanhGia({ 5: 2, 4: 1 }, ['hay quá', 'chơi mượt']) === null);

    const tt = tomTatDanhGia({ 5: 6, 4: 2, 1: 1 }, [
      'đồ hoạ đẹp, chơi mượt lắm',
      'đồ hoạ ổn mà máy yếu vẫn chạy mượt',
      'máy yếu của mình chơi được, đồ hoạ tạm',
      'điều khiển nhạy, chơi mượt',
    ]);
    kiem('tóm tắt nói đúng số bài khen', tt?.includes('8 trong 9 bài'), tt);
    kiem('tóm tắt nhặt được cụm hai tiếng', tt?.includes('đồ hoạ'), tt);
    kiem('tóm tắt không nhặt tiếng đệm',
      !/\b(của|mình|rất|lắm)\b/.test(tt?.split('nhiều nhất:')[1] ?? ''), tt);

    const mot = cumHayNhac(['đồ hoạ đẹp', 'chơi mượt', 'điều khiển nhạy', 'chạy ổn']);
    kiem('cụm chỉ một người nhắc thì không tính là xu hướng', mot.length === 0,
      JSON.stringify(mot));

    /* ── Dựng game và ba người chấm ──────────────────────────────────── */
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm phiếu hữu ích', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
      },
      select: { id: true },
    });

    const bcrypt = (await import('bcryptjs')).default;
    const bam = await bcrypt.hash('thanhvien123', 10);
    const nguoi = [];
    for (let i = 0; i < 3; i++) {
      nguoi.push(await db.nguoiDung.create({
        data: {
          tenDangNhap: `${TEN}-${i}`, tenHienThi: `Người bấm ${i}`,
          email: `${TEN}-${i}@kiemthu.local`, matKhauBam: bam,
        },
        select: { id: true },
      }));
    }

    /* ── Viết đánh giá KÈM TIÊU ĐỀ qua tấm trượt ─────────────────────── */
    p = await moTrangDaDangNhap(`${TEN}-0`, 'thanhvien123');
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    // Mở tấm viết rồi chấm sao TRONG tấm: bấm hàng sao ngoài trang nay là
    // chấm luôn, không mở tấm nào (xem bài 88).
    await p.locator('button:has-text("Viết đánh giá")').first().click();
    await p.waitForSelector('dialog[open]', { timeout: 8000 });
    await p.locator('dialog[open] button[aria-label="Chấm 5 sao"]').click();
    await p.locator('dialog[open] input').first().fill('Nhẹ máy mà vui');
    await p.locator('dialog[open] textarea').first().fill('Chạy mượt trên máy cũ của mình.');
    await p.locator('dialog[open] button:has-text("Gửi đánh giá")').first().click();

    kiem('tiêu đề ghi đúng vào bài đánh giá', await doiToi(async () => {
      const d = await db.danhGia.findUnique({
        where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi[0].id } },
        select: { tieuDe: true },
      });
      return d?.tieuDe === 'Nhẹ máy mà vui';
    }));

    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    kiem('tiêu đề hiện in đậm trên thẻ đánh giá',
      (await p.locator('p.font-bold:text-is("Nhẹ máy mà vui")').count()) > 0);

    /* ── Tiêu đề quá dài bị cắt ở máy chủ ────────────────────────────── */
    await p.locator('button:has-text("Sửa đánh giá")').first().click();
    await p.waitForSelector('dialog[open]', { timeout: 8000 });
    await p.locator('dialog[open] input').first().fill('x'.repeat(400));
    await p.locator('dialog[open] button:has-text("Cập nhật")').first().click();
    kiem('tiêu đề dài bị cắt còn 80 ký tự', await doiToi(async () => {
      const d = await db.danhGia.findUnique({
        where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi[0].id } },
        select: { tieuDe: true },
      });
      return d?.tieuDe?.length === 80;
    }));

    const baiCua0 = await db.danhGia.findUnique({
      where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi[0].id } },
      select: { id: true },
    });

    /* ── Người KHÁC bấm hữu ích ──────────────────────────────────────── */
    khac = await moTrangDaDangNhap(`${TEN}-1`, 'thanhvien123');
    await khac.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    await khac.locator('button[data-viec="huu-ich"]:visible').first().click();

    kiem('bấm hữu ích thì cộng đúng một phiếu', await doiToi(async () => {
      const d = await db.danhGia.findUnique({
        where: { id: baiCua0.id }, select: { soHuuIch: true },
      });
      return d?.soHuuIch === 1;
    }));
    kiem('phiếu ghi thành hàng riêng, đúng một hàng',
      (await db.danhGiaHuuIch.count({ where: { danhGiaId: baiCua0.id } })) === 1);

    /* ── Bấm lần hai là BỎ phiếu, không phải cộng hai ────────────────── */
    await khac.locator('button[data-viec="huu-ich"]:visible').first().click();
    kiem('bấm lần hai thì bỏ phiếu chứ không cộng thành hai', await doiToi(async () => {
      const d = await db.danhGia.findUnique({
        where: { id: baiCua0.id }, select: { soHuuIch: true },
      });
      return d?.soHuuIch === 0
        && (await db.danhGiaHuuIch.count({ where: { danhGiaId: baiCua0.id } })) === 0;
    }));

    /*
     * Bấm lại lần thứ ba — và BẮT luôn yêu cầu của chính cú bấm ấy.
     *
     * Bắt ở một cú bấm riêng thì cú ấy lại lật phiếu về 0, và phép thử phát
     * lại phía dưới hoá ra so 0 với 0: không đổi thật, mà chẳng chứng minh
     * được gì. Bấm này vừa dựng lại phiếu để xét thứ tự kệ, vừa cho mượn yêu
     * cầu — nên sau nó phiếu đứng ở 1 và mọi phép thử sau đều so với 1.
     */
    let donHang = null;
    khac.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie; // bánh quy do ngữ cảnh tự gắn — bỏ ra mới là phép thử
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await khac.locator('button[data-viec="huu-ich"]:visible').first().click();
    kiem('bấm lại lần nữa thì phiếu về đúng 1', await doiToi(async () =>
      (await db.danhGia.findUnique({ where: { id: baiCua0.id }, select: { soHuuIch: true } }))
        ?.soHuuIch === 1));

    /* ── PHÁT LẠI yêu cầu: bài của chính mình thì không ăn ───────────── */
    kiem('bắt được mã băm và thân yêu cầu để phát lại',
      !!donHang?.dau?.['next-action'] && !!donHang?.than);

    if (donHang) {
      // Chính chủ bài viết phát lại đúng yêu cầu ấy: máy chủ phải chối, vì
      // điều kiện "không phải bài của mình" nằm trong `where`, không phải ở
      // chỗ vẽ nút.
      const truoc = (await db.danhGia.findUnique({
        where: { id: baiCua0.id }, select: { soHuuIch: true },
      })).soHuuIch;
      const ma = await p.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      await p.waitForTimeout(500);
      const sau = (await db.danhGia.findUnique({
        where: { id: baiCua0.id }, select: { soHuuIch: true },
      })).soHuuIch;
      kiem('chính chủ bài viết phát lại yêu cầu hữu ích thì không ăn',
        sau === truoc, `máy trả về ${ma}, ${truoc} → ${sau}`);

      // Khách chưa đăng nhập cũng phát lại đúng yêu cầu ấy.
      const guest = await moTrang();
      await guest.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
      await guest.evaluate(async ({ dia, dau, than }) => {
        await fetch(dia, { method: 'POST', headers: dau, body: than });
      }, donHang);
      await guest.waitForTimeout(500);
      const sauKhach = (await db.danhGia.findUnique({
        where: { id: baiCua0.id }, select: { soHuuIch: true },
      })).soHuuIch;
      kiem('khách chưa đăng nhập phát lại yêu cầu hữu ích thì không ăn',
        sauKhach === sau, `${sau} → ${sauKhach}`);
      await guest.close();
    }

    /* ── Kệ sắp theo phiếu: bài nhiều phiếu đứng trước ───────────────── */
    await db.danhGia.create({
      data: {
        gameId: game.id, nguoiId: nguoi[2].id, sao: 4,
        tieuDe: 'Bài chưa ai bấm', noiDung: 'Viết sau nên chưa ai thấy.',
      },
      select: { id: true },
    });

    const xem = await moTrang();
    await xem.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    // Lấy đúng mấy đầu đề TRONG kệ, không lấy chữ đậm khác trên trang: kệ là
    // thẻ anh em ngay sau đầu mục.
    const ke = xem.locator('h3:text-is("Bài hữu ích nhất")')
      .locator('xpath=following-sibling::*[1]');
    const de = await ke.locator('p.font-bold').allInnerTexts();
    kiem('bài có phiếu đứng trước bài chưa ai bấm',
      de[0]?.startsWith('x') && de.includes('Bài chưa ai bấm'), JSON.stringify(de));
    await xem.close();
  } finally {
    await don();
    await p?.close();
    await khac?.close();
  }
}
