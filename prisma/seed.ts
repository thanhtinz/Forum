import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  // ── LevelRule 1–10 ──
  const levels = [
    { level: 1, name: 'Tân binh', expRequired: 0 },
    { level: 2, name: 'Thành viên', expRequired: 100 },
    { level: 3, name: 'Tích cực', expRequired: 300 },
    { level: 4, name: 'Quen thuộc', expRequired: 700 },
    { level: 5, name: 'Kỳ cựu', expRequired: 1500 },
    { level: 6, name: 'Chuyên gia', expRequired: 3000 },
    { level: 7, name: 'Cao thủ', expRequired: 6000 },
    { level: 8, name: 'Bậc thầy', expRequired: 12000 },
    { level: 9, name: 'Huyền thoại', expRequired: 24000 },
    { level: 10, name: 'Đỉnh cao', expRequired: 50000 },
  ];
  for (const l of levels) {
    await db.levelRule.upsert({
      where: { level: l.level },
      update: { name: l.name, expRequired: l.expRequired },
      create: { ...l, dailyDownloadLimit: l.level * 5, canUploadFile: l.level >= 3 },
    });
  }

  // ── VipPlan 3 bậc ──
  const plans = [
    { tier: 1, name: 'VIP Tháng', durationDays: 30, price: 49000, discountPercent: 10, checkinMultiplier: 1.5, color: '#2c7bfe' },
    { tier: 2, name: 'VIP Năm', durationDays: 365, price: 399000, discountPercent: 20, checkinMultiplier: 2, freeContent: false, color: '#8b5cf6' },
    { tier: 3, name: 'VIP Vĩnh viễn', durationDays: null, price: 999000, discountPercent: 30, checkinMultiplier: 3, freeContent: true, permanent: true, color: '#f59e0b' },
  ];
  for (const p of plans) {
    await db.vipPlan.upsert({
      where: { tier: p.tier },
      update: { name: p.name, price: p.price },
      create: { ...p, order: p.tier },
    });
  }

  // ── Medal cơ bản ──
  const medals = [
    { slug: 'newbie', name: 'Tân binh', icon: '🌱', autoGrant: false },
    { slug: 'checkin-7', name: 'Điểm danh 7 ngày', icon: '🔥', autoGrant: true, conditionType: 'checkin_streak', conditionValue: 7 },
    { slug: 'checkin-30', name: 'Điểm danh 30 ngày', icon: '⭐', autoGrant: true, conditionType: 'checkin_streak', conditionValue: 30 },
    { slug: 'checkin-100', name: 'Điểm danh 100 ngày', icon: '👑', autoGrant: true, conditionType: 'checkin_streak', conditionValue: 100 },
    { slug: 'author-10', name: '10 bài viết', icon: '✍️', autoGrant: true, conditionType: 'posts_count', conditionValue: 10 },
  ];
  for (const m of medals) {
    await db.medal.upsert({ where: { slug: m.slug }, update: { name: m.name }, create: m });
  }

  // ── SiteSetting mặc định ──
  const settings: Record<string, unknown> = {
    'site.name': 'Nova Platform',
    'site.description': 'Nền tảng blog + diễn đàn + nội dung trả phí',
    'points.checkinBase': 5,
    'points.checkinStep': 2,
    'points.postCreate': 10,
    'points.commentCreate': 2,
    'points.receivedLike': 1,
    'points.inviteBonus': 50,
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
  }

  // ── Category mẫu ──
  const cats = [
    { slug: 'tin-tuc', name: 'Tin tức', color: '#2c7bfe', order: 1 },
    { slug: 'thu-thuat', name: 'Thủ thuật', color: '#10b981', order: 2 },
    { slug: 'tai-nguyen', name: 'Tài nguyên', color: '#f59e0b', order: 3 },
    { slug: 'chia-se', name: 'Chia sẻ', color: '#ec4899', order: 4 },
  ];
  const catIds: Record<string, string> = {};
  for (const c of cats) {
    const cat = await db.category.upsert({ where: { slug: c.slug }, update: { name: c.name, color: c.color }, create: c });
    catIds[c.slug] = cat.id;
  }

  // ── Admin ──
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await db.user.upsert({
    where: { email: 'admin@nova.local' },
    update: {},
    create: {
      email: 'admin@nova.local',
      username: 'admin',
      name: 'Quản trị viên',
      passwordHash,
      role: 'ADMIN',
      points: 1000,
      balance: 0,
      level: 10,
      exp: 60000,
      inviteCode: 'ADMIN',
    },
  });

  // ── Bài viết mẫu ──
  const samples = [
    { slug: 'chao-mung-nova', title: 'Chào mừng đến với Nova Platform', cat: 'tin-tuc', style: 'STANDARD', access: 'FREE', excerpt: 'Nova là nền tảng blog kết hợp diễn đàn và nội dung trả phí, thiết kế hiện đại lấy cảm hứng từ Zibll.' },
    { slug: 'huong-dan-kiem-diem', title: 'Hướng dẫn kiếm điểm và lên cấp nhanh', cat: 'thu-thuat', style: 'WIDE', access: 'LOGIN_REQUIRED', excerpt: 'Điểm danh mỗi ngày, đăng bài chất lượng, nhận like để tích luỹ điểm và EXP lên cấp.' },
    { slug: 'bo-tai-nguyen-premium', title: 'Bộ tài nguyên thiết kế Premium (mở khoá bằng điểm)', cat: 'tai-nguyen', style: 'STANDARD', access: 'POINTS', pricePoints: 50, excerpt: 'Trọn bộ tài nguyên UI cao cấp, mở khoá bằng điểm tích luỹ.' },
    { slug: 'khoa-hoc-vip', title: 'Khoá học nâng cao chỉ dành cho VIP', cat: 'chia-se', style: 'TEXT_ONLY', access: 'VIP_ONLY', vipTierFree: 1, excerpt: 'Nội dung độc quyền cho thành viên VIP.' },
    { slug: 'tai-lieu-tra-phi', title: 'Tài liệu chuyên sâu (trả phí)', cat: 'tai-nguyen', style: 'STANDARD', access: 'PAID', priceAmount: 20000, excerpt: 'Tài liệu chi tiết, mua một lần dùng mãi mãi.' },
    { slug: 'meo-vat-hang-ngay', title: 'Những mẹo vặt hữu ích hằng ngày', cat: 'thu-thuat', style: 'STANDARD', access: 'FREE', excerpt: 'Tổng hợp các mẹo nhỏ giúp cuộc sống dễ dàng hơn.' },
  ];
  for (const s of samples) {
    await db.post.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        title: s.title,
        excerpt: s.excerpt,
        content: `<p>${s.excerpt}</p><p>Đây là nội dung mẫu của bài viết.</p>`,
        hiddenContent: s.access !== 'FREE' && s.access !== 'LOGIN_REQUIRED' ? '<p>🔒 Nội dung ẩn đã được mở khoá! Đây là phần dành cho người có quyền truy cập.</p>' : null,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: admin.id,
        categoryId: catIds[s.cat],
        cardStyle: s.style as any,
        access: s.access as any,
        pricePoints: (s as any).pricePoints ?? null,
        priceAmount: (s as any).priceAmount ?? null,
        vipTierFree: (s as any).vipTierFree ?? null,
        viewCount: Math.floor(20 + Math.sin(s.slug.length) * 15 + s.title.length),
        likeCount: s.title.length % 30,
        commentCount: s.title.length % 12,
      },
    });
  }

  // ── Forum mẫu ──
  await db.forum.upsert({
    where: { slug: 'thao-luan-chung' },
    update: {},
    create: { slug: 'thao-luan-chung', name: 'Thảo luận chung', description: 'Nơi trao đổi mọi chủ đề', order: 1 },
  });

  console.log('✅ Seed hoàn tất. Admin: admin@nova.local / admin123');
}

main().then(() => db.$disconnect()).catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
