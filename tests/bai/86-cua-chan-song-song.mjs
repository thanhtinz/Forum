import { GOC, db, moTrang } from '../tro-giup.mjs';

const AI = 'ktsongsong@kiemthu.invalid';
const KHOA = `dd:${AI}`;
const BAN = 20;

/**
 * CỬA CHẶN DÒ MẬT KHẨU PHẢI ĐẾM ĐÚNG KHI BỊ BẮN SONG SONG.
 *
 * Bản cũ đếm theo lối đọc-rồi-ghi: lấy `soLan` ra, cộng một trong JavaScript,
 * rồi ghi xuống. Chú thích của chính nó cho rằng thiệt hại "cùng lắm là đếm
 * thiếu một lần" — đúng với hai lượt chạy song song, nhưng SAI hẳn với hai
 * mươi: cả hai mươi cùng đọc ra `soLan = k` rồi cùng ghi `k + 1`.
 *
 * Đo thật trên bản cũ: bắn 30 lượt song song thì bộ đếm dừng ở 1, và mốc cấm
 * KHÔNG hề được đặt. Nghĩa là gõ thử mật khẩu bao nhiêu lần cũng được, miễn là
 * bắn thành từng loạt — cửa chặn dò mật khẩu coi như không tồn tại.
 *
 * Bài này bắn thẳng vào chính lối đăng nhập, không gọi hàm trong thư viện: thứ
 * cần canh là cái cửa mà người ngoài chạm tới được.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.lanHong.deleteMany({ where: { khoa: { in: [KHOA] } } });
  };
  await don();

  let p;
  try {
    p = await moTrang();

    /*
     * Bắt lấy một lượt đăng nhập THẬT rồi phát lại song song.
     *
     * Không dựng lấy thân yêu cầu: lối đăng nhập là một server action, thân
     * của nó mang định dạng riêng của Next kèm mã action — bịa ra thì bài kiểm
     * đo một thứ ngoài đời không có.
     */
    let don2 = null;
    p.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      const than = yc.postData();
      if (!than || !than.includes(AI)) return;
      don2 = { dia: yc.url(), dau, than };
    });

    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', AI);
    await p.fill('input[name="matKhau"]', 'chac-chan-sai-mat-khau');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(2000);

    kiem('bắt được một lượt đăng nhập sai để phát lại', !!don2?.than);
    const sauMot = await db.lanHong.findUnique({ where: { khoa: KHOA } });
    kiem('một lượt gõ sai được ghi lại', sauMot?.soLan === 1, `đếm ${sauMot?.soLan}`);

    if (don2) {
      await db.lanHong.deleteMany({ where: { khoa: KHOA } });

      // Bắn cả loạt CÙNG LÚC — đây đúng là chỗ bản cũ vỡ.
      await p.evaluate(async ({ dia, dau, than, ban }) => {
        await Promise.all(Array.from({ length: ban }, () =>
          fetch(dia, { method: 'POST', headers: dau, body: than }).catch(() => {})));
      }, { ...don2, ban: BAN });
      await p.waitForTimeout(2500);

      const sau = await db.lanHong.findUnique({ where: { khoa: KHOA } });
      /*
       * Không đòi đếm đúng chằn chặn `BAN`: vài lượt có thể rơi vì mạng hay vì
       * máy chủ bận. Đòi ĐA SỐ — bản cũ dừng ở 1, nên ngưỡng này phân biệt
       * được hai bản mà không đỏ oan vì một lượt rơi.
       */
      kiem(`bắn ${BAN} lượt song song thì đếm được đa số, không dừng ở một`,
        (sau?.soLan ?? 0) >= BAN / 2, `đếm được ${sau?.soLan ?? 0}/${BAN}`);

      kiem('và vượt trần thì mốc cấm được đặt',
        !!sau?.camDen, `soLan=${sau?.soLan}, camDen=${sau?.camDen ?? 'không có'}`);

      /*
       * Mặt kia của cùng một đồng xu: cấm rồi thì lối đăng nhập phải NÓI RA,
       * chứ không im lặng cho gõ tiếp. Cửa chặn mà người gõ không biết mình bị
       * chặn thì họ cứ gõ, và cửa ấy chỉ tốn tài nguyên chứ không cản được ai.
       */
      await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
      await p.fill('input[name="dinhDanh"]', AI);
      await p.fill('input[name="matKhau"]', 'lai-sai-nua');
      await p.click('button[type="submit"]');
      await p.waitForTimeout(2000);
      const chu = await p.locator('body').innerText();
      kiem('bị cấm rồi thì trang nói rõ phải đợi',
        /thử lại sau|đợi|phút/i.test(chu), chu.slice(0, 120));
    }
  } finally {
    if (p) await p.close();
    await don();
  }
}
