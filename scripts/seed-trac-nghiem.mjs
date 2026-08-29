#!/usr/bin/env node
/**
 * Dữ liệu mẫu cho trò Trắc nghiệm: năm thể loại và mấy câu hỏi ĐÃ DUYỆT.
 *
 * Chạy:  node scripts/seed-trac-nghiem.mjs
 *
 * Vì sao cần: câu hỏi trong trò này là do THÀNH VIÊN đăng, mà đăng thì phải
 * đặt cọc và chờ duyệt. Diễn đàn mới dựng chưa ai đăng gì cả, nên trang trắc
 * nghiệm trống trơn — người đầu tiên ghé vào không hiểu trò này chơi kiểu gì.
 * Mấy câu mẫu dưới đây chỉ để trang có hình hài lúc mới mở.
 *
 * Người đứng tên câu hỏi: tài khoản ADMIN cũ nhất. Cọc của mấy câu này KHÔNG
 * bị trừ vào điểm của ai — đây là dữ liệu mẫu nhét thẳng vào bảng, không đi
 * qua luật đặt cọc. Ai trả lời đúng thì vẫn ăn điểm của tài khoản ấy như
 * thường, nên đừng nạp bản mẫu này vào một diễn đàn đang chạy thật.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/** slug phải khớp với địa chỉ trang thể loại, nên đặt sẵn thay vì sinh từ tên. */
const THE_LOAI = [
  {
    slug: 'lich-su-viet-nam',
    name: 'Lịch sử Việt Nam',
    note: 'Nhân vật, sự kiện, mốc thời gian trong sử Việt.',
    order: 1,
  },
  {
    slug: 'dia-ly',
    name: 'Địa lý',
    note: 'Sông núi, tỉnh thành, thủ đô, những thứ trên bản đồ.',
    order: 2,
  },
  {
    slug: 'khoa-hoc-tu-nhien',
    name: 'Khoa học tự nhiên',
    note: 'Toán, lý, hoá, sinh — hỏi thứ có đáp án dứt khoát.',
    order: 3,
  },
  {
    slug: 'van-hoc-nghe-thuat',
    name: 'Văn học nghệ thuật',
    note: 'Tác phẩm, tác giả, âm nhạc, hội hoạ, phim ảnh.',
    order: 4,
  },
  {
    slug: 'tin-hoc-cong-nghe',
    name: 'Tin học công nghệ',
    note: 'Máy tính, mạng, phần mềm và mấy thứ quanh đó.',
    order: 5,
  },
];

/**
 * Câu hỏi mẫu. `correct` là CHỈ SỐ trong `options`, đếm từ 0.
 *
 * Cọc để trong khoảng 10–50 đúng như luật, và cố ý rải đều chứ không đặt cùng
 * một mức: người mới vào nhìn danh sách phải thấy ngay là cọc do người ra câu
 * tự chọn, chứ không phải con số cố định của hệ thống.
 */
const CAU_HOI = [
  {
    cat: 'lich-su-viet-nam',
    content: 'Chiến thắng Bạch Đằng năm 938 do vị tướng nào chỉ huy?',
    options: ['Ngô Quyền', 'Lê Hoàn', 'Trần Hưng Đạo', 'Lý Thường Kiệt'],
    correct: 0,
    explain: 'Ngô Quyền đóng cọc trên sông Bạch Đằng, đánh tan quân Nam Hán năm 938, mở ra thời kỳ độc lập.',
    price: 20,
  },
  {
    cat: 'lich-su-viet-nam',
    content: 'Nhà Lý dời đô từ Hoa Lư ra Thăng Long vào năm nào?',
    options: ['Năm 968', 'Năm 1010', 'Năm 1225', 'Năm 1428'],
    correct: 1,
    explain: 'Năm 1010, Lý Thái Tổ ra Chiếu dời đô, chuyển kinh đô từ Hoa Lư ra thành Đại La rồi đổi tên là Thăng Long.',
    price: 25,
  },
  {
    cat: 'dia-ly',
    content: 'Tỉnh nào của Việt Nam có đường bờ biển dài nhất?',
    options: ['Quảng Ninh', 'Khánh Hoà', 'Cà Mau', 'Bình Thuận'],
    correct: 1,
    explain: 'Khánh Hoà có bờ biển dài khoảng 385 km, dài nhất trong các tỉnh thành ven biển.',
    price: 15,
  },
  {
    cat: 'dia-ly',
    content: 'Con sông nào dài nhất chảy qua lãnh thổ Việt Nam?',
    options: ['Sông Hồng', 'Sông Đà', 'Sông Đồng Nai', 'Sông Mê Kông'],
    correct: 3,
    explain: 'Mê Kông là sông dài nhất chảy qua Việt Nam; đoạn hạ lưu trong nước quen gọi là sông Cửu Long.',
    price: 10,
  },
  {
    cat: 'khoa-hoc-tu-nhien',
    content: 'Nguyên tố hoá học nào có ký hiệu là Fe?',
    options: ['Đồng', 'Sắt', 'Chì', 'Kẽm'],
    correct: 1,
    explain: 'Fe viết tắt từ chữ Latin "ferrum", nghĩa là sắt.',
    price: 10,
  },
  {
    cat: 'khoa-hoc-tu-nhien',
    content: 'Một năm ánh sáng là đơn vị đo cái gì?',
    options: ['Thời gian', 'Khoảng cách', 'Vận tốc', 'Khối lượng'],
    correct: 1,
    explain: 'Năm ánh sáng là quãng đường ánh sáng đi được trong một năm, tức là một đơn vị đo khoảng cách.',
    price: 30,
  },
  {
    cat: 'van-hoc-nghe-thuat',
    content: 'Tác phẩm "Truyện Kiều" do ai sáng tác?',
    options: ['Nguyễn Trãi', 'Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Đình Chiểu'],
    correct: 1,
    explain: 'Truyện Kiều (Đoạn trường tân thanh) là tác phẩm của đại thi hào Nguyễn Du.',
    price: 15,
  },
  {
    cat: 'van-hoc-nghe-thuat',
    content: 'Nhân vật Chí Phèo là của nhà văn nào?',
    options: ['Nam Cao', 'Ngô Tất Tố', 'Vũ Trọng Phụng', 'Thạch Lam'],
    correct: 0,
    explain: 'Chí Phèo là truyện ngắn của Nam Cao, in lần đầu năm 1941.',
    price: 20,
  },
  {
    cat: 'tin-hoc-cong-nghe',
    content: 'Trong tin học, 1 byte bằng bao nhiêu bit?',
    options: ['4 bit', '8 bit', '16 bit', '32 bit'],
    correct: 1,
    explain: 'Một byte gồm 8 bit — đây là quy ước chuẩn của mọi máy tính hiện nay.',
    price: 10,
  },
  {
    cat: 'tin-hoc-cong-nghe',
    content: 'HTTP là chữ viết tắt của cụm từ nào?',
    options: [
      'HyperText Transfer Protocol',
      'High Transfer Text Protocol',
      'HyperText Transport Package',
      'Home Text Transfer Protocol',
    ],
    correct: 0,
    explain: 'HTTP là HyperText Transfer Protocol — giao thức truyền siêu văn bản giữa trình duyệt và máy chủ.',
    price: 35,
  },
];

async function main() {
  // Người đứng tên: quản trị viên cũ nhất. Không có ai thì dừng — tạo câu hỏi
  // mồ côi tác giả là hỏng khoá ngoại, mà tạo bừa một tài khoản mới thì tệ hơn.
  const admin = await db.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, name: true },
  });
  if (!admin) {
    console.error('✗ Chưa có tài khoản ADMIN nào để đứng tên câu hỏi mẫu. Tạo admin trước đã.');
    process.exit(1);
  }

  const bangSlug = new Map();
  for (const t of THE_LOAI) {
    const tl = await db.quizCategory.upsert({
      where: { slug: t.slug },
      update: { name: t.name, note: t.note, order: t.order },
      create: t,
      select: { id: true },
    });
    bangSlug.set(t.slug, tl.id);
  }

  // Không có khoá tự nhiên nào cho câu hỏi nên `upsert` theo nội dung: chạy
  // lại lệnh này lần thứ hai không được đẻ thêm một bộ câu hỏi giống hệt.
  let them = 0;
  for (const c of CAU_HOI) {
    const da = await db.quizQuestion.findFirst({
      where: { content: c.content, authorId: admin.id },
      select: { id: true },
    });
    if (da) continue;

    await db.quizQuestion.create({
      data: {
        authorId: admin.id,
        categoryId: bangSlug.get(c.cat),
        content: c.content,
        options: c.options,
        correct: c.correct,
        explain: c.explain,
        price: c.price,
        status: 'APPROVED',
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      select: { id: true },
    });
    them++;
  }

  console.log(`✓ ${THE_LOAI.length} thể loại đã sẵn sàng.`);
  console.log(`✓ Thêm ${them} câu hỏi mẫu (bỏ qua ${CAU_HOI.length - them} câu đã có).`);
  console.log(`  Đứng tên: ${admin.name ?? admin.username ?? admin.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
