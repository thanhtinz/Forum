import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Trắc nghiệm — chủ yếu soi chỗ tiền đi qua.
 *
 * Mục kiểm nặng nhất ở đây là MÁY SOI ĐÁP ÁN: người có ít điểm hơn tiền cọc mà
 * vẫn bấm trả lời được thì đoán sai chẳng mất gì (giao dịch quay lại, lượt trả
 * lời không được ghi, thử lại vô hạn) còn đoán đúng thì thành công vì nhánh
 * đúng do NGƯỜI RA CÂU trả tiền. Dò bốn lượt là ra đáp án, rồi mang tài khoản
 * chính vào ăn trọn tiền cọc mà không có rủi ro nào.
 *
 * Nên bài này khẳng định: thiếu điểm thì bị chặn NGAY, và bị chặn y hệt nhau dù
 * đoán đúng hay đoán sai — không còn gì để dò.
 */

const DAU = 'kiemthu-quiz';

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const doc = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!chu || !doc) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async (id) =>
    (await db.user.findUnique({ where: { id }, select: { points: true } }))?.points ?? 0;
  const diemCu = { chu: await diem(chu.id), doc: await diem(doc.id) };

  const wipe = async () => {
    const cs = await db.quizQuestion.findMany({
      where: { content: { startsWith: DAU } }, select: { id: true },
    });
    if (cs.length) {
      const ids = cs.map((c) => c.id);
      await db.quizAnswer.deleteMany({ where: { questionId: { in: ids } } });
      await db.quizComment.deleteMany({ where: { questionId: { in: ids } } });
      await db.quizQuestion.deleteMany({ where: { id: { in: ids } } });
    }
  };
  await wipe();

  try {
    const cau = await db.quizQuestion.create({
      data: {
        authorId: chu.id,
        content: `${DAU} Thủ đô của Việt Nam là gì?`,
        options: ['Hải Phòng', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'],
        correct: 1,
        explain: 'Hà Nội là thủ đô từ năm 1945.',
        price: 30,
        status: 'APPROVED',
      },
      select: { id: true },
    });

    const trang = `${BASE}/giai-tri/trac-nghiem/cau-hoi/${cau.id}`;

    // ── Đáp án KHÔNG được rời máy chủ khi chưa trả lời ───────────────────
    const khach = await openPage(null);
    await khach.goto(trang, { waitUntil: 'networkidle' });
    const mangKhach = await khach.content();
    check('khách chưa trả lời thì lời giải không lọt vào mã trang',
      !mangKhach.includes('Hà Nội là thủ đô từ năm 1945'));

    // ── Thiếu điểm thì bị chặn NGAY, và chặn y hệt dù đoán đúng hay sai ──
    // Đây là chỗ từng thành máy soi đáp án.
    await db.user.update({ where: { id: doc.id }, data: { points: 5 } });
    const p = await openPage('huytran');

    const thuDoan = async (chon) => {
      await p.goto(trang, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      const o = p.locator(`input[name="chon"][value="${chon}"]`);
      if ((await o.count()) === 0) return { loi: 'không thấy ô chọn' };
      // Ô radio nằm dưới nhãn bọc ngoài nên phải `force` — đây là cách
      // giao diện dựng, không phải lỗi.
      await o.check({ force: true });
      await p.locator('button[type="submit"]').first().click();
      await p.waitForTimeout(2000);
      return { chu: (await p.locator('main').innerText()).slice(0, 400) };
    };

    const doanSai = await thuDoan(0);   // sai
    const doanDung = await thuDoan(1);  // đúng

    check('thiếu điểm: đoán SAI thì bị chặn',
      /không đủ điểm/i.test(doanSai.chu ?? ''), (doanSai.chu ?? doanSai.loi)?.slice(0, 120));
    check('thiếu điểm: đoán ĐÚNG cũng bị chặn y hệt',
      /không đủ điểm/i.test(doanDung.chu ?? ''), (doanDung.chu ?? doanDung.loi)?.slice(0, 120));
    check('bị chặn thì KHÔNG lộ đáp án ra trang',
      !/Hà Nội là thủ đô từ năm 1945/.test(doanDung.chu ?? ''));
    check('bị chặn thì không ghi lượt trả lời nào',
      (await db.quizAnswer.count({ where: { questionId: cau.id } })) === 0);
    check('bị chặn thì không ai mất hay được điểm',
      (await diem(doc.id)) === 5 && (await diem(chu.id)) === diemCu.chu,
      `người đọc ${await diem(doc.id)}, người ra câu ${await diem(chu.id)}`);

    // ── Đủ điểm thì trả lời được, và chỉ một lần ─────────────────────────
    await db.user.update({ where: { id: doc.id }, data: { points: 500 } });
    const chuTruoc = await diem(chu.id);

    await p.goto(trang, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    await p.locator('input[name="chon"][value="1"]').check({ force: true });
    await p.locator('button[type="submit"]').first().click();
    await doiToi(async () => (await db.quizAnswer.count({ where: { questionId: cau.id } })) > 0);

    const luot = await db.quizAnswer.findFirst({
      where: { questionId: cau.id }, select: { chosen: true, correct: true, userId: true },
    });
    check('đủ điểm thì lượt trả lời được ghi', luot?.userId === doc.id);
    check('ghi đúng đáp án đã chọn', luot?.chosen === 1 && luot?.correct === true);
    check('trả lời đúng thì ăn đúng tiền cọc của người ra câu',
      (await diem(doc.id)) === 500 + 30 && (await diem(chu.id)) === chuTruoc - 30,
      `đọc ${await diem(doc.id)}, ra câu ${await diem(chu.id)}`);

    // Trả lời lần hai phải bị chặn bởi ràng buộc duy nhất
    const truocLai = await diem(doc.id);
    await p.goto(trang, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const conO = await p.locator('input[name="chon"]:not([disabled])').count();
    check('trả lời rồi thì không còn ô chọn nào bấm được', conO === 0, `còn ${conO} ô`);
    check('và điểm không đổi thêm lần nữa', (await diem(doc.id)) === truocLai);

    // ── Trả lời rồi thì mới thấy lời giải ────────────────────────────────
    check('trả lời xong mới hiện lời giải',
      (await p.locator('main').innerText()).includes('Hà Nội là thủ đô từ năm 1945'));

    // ── Không tự trả lời câu của chính mình ──────────────────────────────
    const tuTra = await openPage('minhdev');
    await tuTra.goto(trang, { waitUntil: 'networkidle' });
    await tuTra.waitForTimeout(700);
    const oCuaMinh = await tuTra.locator('input[name="chon"]:not([disabled])').count();
    check('không trả lời được câu của chính mình', oCuaMinh === 0, `còn ${oCuaMinh} ô`);
  } finally {
    await wipe();
    await db.user.update({ where: { id: chu.id }, data: { points: diemCu.chu } });
    await db.user.update({ where: { id: doc.id }, data: { points: diemCu.doc } });
  }
}
