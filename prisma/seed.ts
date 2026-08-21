import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

/** Checksum mẫu cho file game seed — file thật sẽ có checksum tính từ nội dung. */
const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');

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

  // ── Category mẫu (có phân cấp cha/con) ──
  const cats: Array<{ slug: string; name: string; color: string; order: number; parent?: string }> = [
    // Chuyên mục lớn (cha)
    { slug: 'tin-tuc', name: 'Tin tức', color: '#2c7bfe', order: 1 },
    { slug: 'thu-thuat', name: 'Thủ thuật', color: '#10b981', order: 2 },
    { slug: 'tai-nguyen', name: 'Tài nguyên', color: '#f59e0b', order: 3 },
    { slug: 'chia-se', name: 'Chia sẻ', color: '#ec4899', order: 4 },
    // Chuyên mục nhỏ (con)
    { slug: 'ui-kit', name: 'UI Kit', color: '#8b5cf6', order: 1, parent: 'tai-nguyen' },
    { slug: 'source-code', name: 'Source Code', color: '#0ea5e9', order: 2, parent: 'tai-nguyen' },
    { slug: 'windows', name: 'Windows', color: '#3b82f6', order: 1, parent: 'thu-thuat' },
  ];
  const catIds: Record<string, string> = {};
  for (const c of cats) {
    const data = { slug: c.slug, name: c.name, color: c.color, order: c.order, parentId: c.parent ? catIds[c.parent] : null };
    const cat = await db.category.upsert({ where: { slug: c.slug }, update: { name: c.name, color: c.color, parentId: data.parentId }, create: data });
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
    { slug: 'chao-mung-nova', title: 'Chào mừng đến với Nova Platform', cat: 'tin-tuc', cats: ['tin-tuc'], style: 'STANDARD', access: 'FREE', excerpt: 'Nova là nền tảng blog kết hợp diễn đàn và nội dung trả phí, thiết kế hiện đại lấy cảm hứng từ Zibll.', tags: ['Nova', 'Thông báo', 'Giới thiệu'] },
    { slug: 'huong-dan-kiem-diem', title: 'Hướng dẫn kiếm điểm và lên cấp nhanh', cat: 'thu-thuat', cats: ['thu-thuat', 'windows'], style: 'WIDE', access: 'LOGIN_REQUIRED', excerpt: 'Điểm danh mỗi ngày, đăng bài chất lượng, nhận like để tích luỹ điểm và EXP lên cấp.', tags: ['Điểm', 'Cấp độ', 'Mẹo', 'Điểm danh'] },
    { slug: 'bo-tai-nguyen-premium', title: 'Bộ tài nguyên thiết kế Premium (mở khoá bằng điểm)', cat: 'tai-nguyen', cats: ['tai-nguyen', 'ui-kit', 'source-code'], style: 'STANDARD', access: 'POINTS', pricePoints: 50, type: 'RESOURCE', excerpt: 'Trọn bộ tài nguyên UI cao cấp, mở khoá bằng điểm tích luỹ.', downloads: [{ label: 'Nova-UI-Kit-v2.zip', provider: 'gdrive', version: 'v2.0', sizeBytes: 48234496, password: 'nova2026' }], faq: [{ q: 'Mua rồi có tải lại được không?', a: 'Có. Sau khi mở khoá, bạn tải lại bao nhiêu lần tuỳ thích trong giới hạn lượt tải mỗi ngày theo cấp độ.' }, { q: 'File có mật khẩu giải nén không?', a: 'Có, mật khẩu hiển thị ngay trong khối tải xuống sau khi bạn mở khoá.' }, { q: 'Tôi có được dùng cho dự án thương mại?', a: 'Vui lòng đọc phần Tuyên bố bản quyền phía trên khung mua hàng.' }], tags: ['UI Kit', 'Thiết kế', 'Figma', 'Premium', 'Tài nguyên'] },
    { slug: 'khoa-hoc-vip', title: 'Khoá học nâng cao chỉ dành cho VIP', cat: 'chia-se', cats: ['chia-se', 'tai-nguyen'], style: 'TEXT_ONLY', access: 'VIP_ONLY', vipTierFree: 1, type: 'RESOURCE', excerpt: 'Nội dung độc quyền cho thành viên VIP.', downloads: [{ label: 'Khoa-hoc-nang-cao.pdf', provider: 'local', version: '1.0', sizeBytes: 15728640 }], tags: ['VIP', 'Khoá học', 'Nâng cao'] },
    { slug: 'tai-lieu-tra-phi', title: 'Tài liệu chuyên sâu (trả phí)', cat: 'tai-nguyen', cats: ['tai-nguyen', 'source-code'], style: 'STANDARD', access: 'PAID', priceAmount: 20000, type: 'RESOURCE', excerpt: 'Tài liệu chi tiết, mua một lần dùng mãi mãi.', downloads: [{ label: 'Tai-lieu-chuyen-sau.pdf', provider: 'local', version: '1.0', sizeBytes: 8388608, extractCode: 'x9k2' }], tags: ['Tài liệu', 'PDF', 'Chuyên sâu', 'Trả phí'] },
    { slug: 'meo-vat-hang-ngay', title: 'Những mẹo vặt hữu ích hằng ngày', cat: 'thu-thuat', cats: ['thu-thuat'], style: 'STANDARD', access: 'FREE', excerpt: 'Tổng hợp các mẹo nhỏ giúp cuộc sống dễ dàng hơn.', tags: ['Mẹo vặt', 'Đời sống', 'Hằng ngày'] },
  ];
  for (const s of samples) {
    const post = await db.post.upsert({
      where: { slug: s.slug },
      update: { type: ((s as any).type ?? 'ARTICLE') as any, faq: (s as any).faq ?? undefined },
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
        type: ((s as any).type ?? 'ARTICLE') as any,
        cardStyle: s.style as any,
        access: s.access as any,
        pricePoints: (s as any).pricePoints ?? null,
        priceAmount: (s as any).priceAmount ?? null,
        vipTierFree: (s as any).vipTierFree ?? null,
        faq: (s as any).faq ?? undefined,
        viewCount: Math.floor(20 + Math.sin(s.slug.length) * 15 + s.title.length),
        likeCount: s.title.length % 30,
        commentCount: s.title.length % 12,
      },
    });

    // File tải xuống (idempotent: xoá cũ rồi tạo lại)
    const downloads = (s as any).downloads as Array<Record<string, any>> | undefined;
    if (downloads?.length) {
      await db.downloadItem.deleteMany({ where: { postId: post.id } });
      await db.downloadItem.createMany({
        data: downloads.map((d, i) => ({
          postId: post.id,
          label: d.label,
          url: d.url ?? `https://example.com/files/${s.slug}-${i + 1}`,
          provider: d.provider ?? 'local',
          version: d.version ?? null,
          password: d.password ?? null,
          extractCode: d.extractCode ?? null,
          sizeBytes: d.sizeBytes ?? null,
          order: i,
        })),
      });
    }

    // Nhiều chuyên mục — nối bài vào tất cả chuyên mục trong `cats` (idempotent)
    const postCats = ((s as any).cats as string[] | undefined) ?? [s.cat];
    await db.categoriesOnPosts.deleteMany({ where: { postId: post.id } });
    for (const cs of postCats) {
      if (catIds[cs]) {
        await db.categoriesOnPosts.create({ data: { postId: post.id, categoryId: catIds[cs] } });
      }
    }

    // Thẻ (tag) của bài — upsert tag rồi nối vào bài (idempotent)
    const tags = (s as any).tags as string[] | undefined;
    if (tags?.length) {
      await db.tagsOnPosts.deleteMany({ where: { postId: post.id } });
      for (const name of tags) {
        const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const tag = await db.tag.upsert({ where: { slug }, update: {}, create: { slug, name } });
        await db.tagsOnPosts.create({ data: { postId: post.id, tagId: tag.id } });
      }
    }
  }

  // ── Thành viên mẫu (tác giả chủ đề / trả lời) ──
  const memberSeeds = [
    { email: 'minh@nova.local', username: 'minhdev', name: 'Minh Dev', points: 320, level: 4, exp: 800 },
    { email: 'lan@nova.local', username: 'lanpham', name: 'Lan Phạm', points: 180, level: 3, exp: 350 },
    { email: 'huy@nova.local', username: 'huytran', name: 'Huy Trần', points: 90, level: 2, exp: 150 },
  ];
  const memberPass = await bcrypt.hash('member123', 10);
  const members: Record<string, { id: string }> = {};
  for (const m of memberSeeds) {
    const u = await db.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        username: m.username,
        name: m.name,
        passwordHash: memberPass,
        role: 'USER',
        points: m.points,
        balance: 0,
        level: m.level,
        exp: m.exp,
        inviteCode: m.username.toUpperCase(),
      },
    });
    members[m.username] = { id: u.id };
  }
  const authorId = (u: string) => (u === 'admin' ? admin.id : members[u]?.id ?? admin.id);

  // ── Forum mẫu (có phân cấp cha/con) ──
  const forumSeeds: Array<{
    slug: string; name: string; description: string; icon?: string; order: number;
    parent?: string; postAccess?: 'ALL' | 'MEMBERS' | 'VIP' | 'MODERATORS'; minLevel?: number; vipOnly?: boolean;
  }> = [
    { slug: 'cong-dong', name: 'Cộng đồng', description: 'Khu vực giao lưu của thành viên Nova', icon: '💬', order: 1 },
    { slug: 'thao-luan-chung', name: 'Thảo luận chung', description: 'Nơi trao đổi mọi chủ đề', icon: '🗨️', order: 1, parent: 'cong-dong' },
    { slug: 'gioi-thieu', name: 'Giới thiệu bản thân', description: 'Chào hỏi và làm quen với mọi người', icon: '👋', order: 2, parent: 'cong-dong' },
    { slug: 'ho-tro', name: 'Hỗ trợ', description: 'Khu vực hỏi đáp và báo lỗi', icon: '🛠️', order: 2 },
    { slug: 'hoi-dap', name: 'Hỏi đáp', description: 'Đặt câu hỏi và nhận trợ giúp từ cộng đồng', icon: '❓', order: 1, parent: 'ho-tro' },
    { slug: 'gop-y', name: 'Góp ý & Báo lỗi', description: 'Đề xuất tính năng và báo lỗi hệ thống', icon: '🐛', order: 2, parent: 'ho-tro' },
    { slug: 'vip-lounge', name: 'Phòng VIP', description: 'Khu vực riêng dành cho thành viên VIP', icon: '👑', order: 3, postAccess: 'VIP', vipOnly: true },
  ];
  const forumIds: Record<string, string> = {};
  for (const f of forumSeeds) {
    const data = {
      slug: f.slug,
      name: f.name,
      description: f.description,
      icon: f.icon ?? null,
      order: f.order,
      parentId: f.parent ? forumIds[f.parent] : null,
      postAccess: (f.postAccess ?? 'ALL') as any,
      minLevel: f.minLevel ?? 1,
      vipOnly: f.vipOnly ?? false,
    };
    const forum = await db.forum.upsert({
      where: { slug: f.slug },
      update: { name: f.name, description: f.description, icon: data.icon, order: f.order, parentId: data.parentId, postAccess: data.postAccess, vipOnly: data.vipOnly },
      create: data,
    });
    forumIds[f.slug] = forum.id;
  }

  // ── Chủ đề (Thread) + Trả lời (Reply) mẫu ──
  // Mỗi chủ đề idempotent theo (forumId, title); trả lời chỉ tạo khi chủ đề chưa có reply.
  const threadSeeds: Array<{
    forum: string; author: string; title: string; content: string;
    pinned?: boolean; locked?: boolean; featured?: boolean; bountyPoints?: number;
    tags?: string[];
    replies?: Array<{ author: string; content: string; solution?: boolean; likeCount?: number; children?: Array<{ author: string; content: string; likeCount?: number }> }>;
  }> = [
    {
      forum: 'thao-luan-chung', author: 'admin', title: 'Nội quy diễn đàn Nova — vui lòng đọc trước khi đăng',
      content: '<p>Chào mừng bạn đến với diễn đàn Nova. Hãy tôn trọng lẫn nhau, không spam và đăng bài đúng chuyên mục.</p><p>Vi phạm nhiều lần có thể bị khoá tài khoản.</p>',
      pinned: true, locked: true, featured: true, tags: ['Nội quy', 'Thông báo'],
      replies: [
        { author: 'minhdev', content: 'Đã đọc và nắm rõ, cảm ơn ban quản trị!', likeCount: 4 },
        { author: 'lanpham', content: 'Nội quy rõ ràng, rất hợp lý 👍', likeCount: 2 },
      ],
    },
    {
      forum: 'thao-luan-chung', author: 'minhdev', title: 'Mọi người đang dùng công cụ nào để quản lý công việc?',
      content: '<p>Mình đang tìm một công cụ quản lý task nhẹ nhàng, mọi người gợi ý giúp với nhé.</p>',
      tags: ['Thảo luận', 'Công cụ'],
      replies: [
        { author: 'huytran', content: 'Mình dùng Notion, khá linh hoạt.', likeCount: 3, children: [
          { author: 'minhdev', content: 'Notion đúng là ngon nhưng hơi nặng lúc mở nhiều trang.', likeCount: 1 },
        ] },
        { author: 'lanpham', content: 'Todoist cho cá nhân là đủ rồi.', likeCount: 2 },
      ],
    },
    {
      forum: 'gioi-thieu', author: 'lanpham', title: 'Xin chào cả nhà, mình là Lan!',
      content: '<p>Mình là newbie mới tham gia, mong được mọi người giúp đỡ 😄</p>',
      tags: ['Chào hỏi'],
      replies: [
        { author: 'admin', content: 'Chào mừng Lan đến với Nova! 🎉', likeCount: 5 },
        { author: 'huytran', content: 'Chào bạn nha!', likeCount: 1 },
      ],
    },
    {
      forum: 'hoi-dap', author: 'huytran', title: 'Làm sao để mở khoá nội dung bằng điểm?',
      content: '<p>Mình có đủ điểm nhưng không thấy nút mở khoá ở đâu, ai chỉ giúp với?</p>',
      bountyPoints: 20, tags: ['Hỏi đáp', 'Điểm'],
      replies: [
        { author: 'minhdev', content: 'Bạn cuộn xuống khối "Tải xuống" trong bài, nút mở khoá nằm ngay đó nhé.', solution: true, likeCount: 6 },
        { author: 'lanpham', content: 'Mình cũng từng bị, hoá ra do chưa đăng nhập 😅', likeCount: 1 },
      ],
    },
    {
      forum: 'gop-y', author: 'minhdev', title: 'Đề xuất: thêm chế độ tối (dark mode)',
      content: '<p>Giao diện sáng nhìn hơi chói vào buổi tối, mong đội ngũ cân nhắc thêm dark mode.</p>',
      tags: ['Góp ý', 'Giao diện'],
      replies: [
        { author: 'admin', content: 'Cảm ơn góp ý, tính năng này đã được đưa vào kế hoạch phát triển 🌙', likeCount: 8 },
      ],
    },
  ];

  for (const t of threadSeeds) {
    const forumId = forumIds[t.forum];
    if (!forumId) continue;
    let thread = await db.thread.findFirst({ where: { forumId, title: t.title }, select: { id: true } });
    if (!thread) {
      const created = await db.thread.create({
        data: {
          forumId,
          authorId: authorId(t.author),
          title: t.title,
          content: t.content,
          status: 'PUBLISHED',
          pinned: t.pinned ?? false,
          locked: t.locked ?? false,
          featured: t.featured ?? false,
          bountyPoints: t.bountyPoints ?? null,
          viewCount: Math.floor(30 + Math.sin(t.title.length) * 20 + t.title.length),
          likeCount: t.title.length % 15,
        },
      });
      thread = { id: created.id };
    }

    // Trả lời — chỉ tạo khi chủ đề chưa có reply nào (idempotent)
    const existing = await db.reply.count({ where: { threadId: thread.id } });
    if (existing === 0 && t.replies?.length) {
      let solvedReplyId: string | null = null;
      let last: Date = new Date();
      for (const r of t.replies) {
        const reply = await db.reply.create({
          data: {
            threadId: thread.id,
            authorId: authorId(r.author),
            content: r.content,
            likeCount: r.likeCount ?? 0,
            isSolution: r.solution ?? false,
          },
        });
        last = reply.createdAt;
        if (r.solution) solvedReplyId = reply.id;
        for (const c of r.children ?? []) {
          const child = await db.reply.create({
            data: {
              threadId: thread.id,
              authorId: authorId(c.author),
              content: c.content,
              parentId: reply.id,
              likeCount: c.likeCount ?? 0,
            },
          });
          last = child.createdAt;
        }
      }
      const total = await db.reply.count({ where: { threadId: thread.id } });
      await db.thread.update({
        where: { id: thread.id },
        data: { replyCount: total, lastReplyAt: last, solvedReplyId: solvedReplyId ?? undefined },
      });
    }

    // Thẻ của chủ đề — upsert tag rồi nối (idempotent)
    if (t.tags?.length) {
      await db.tagsOnThreads.deleteMany({ where: { threadId: thread.id } });
      for (const name of t.tags) {
        const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const tag = await db.tag.upsert({ where: { slug }, update: {}, create: { slug, name } });
        await db.tagsOnThreads.create({ data: { threadId: thread.id, tagId: tag.id } });
      }
    }
  }

  // ── Cập nhật threadCount / replyCount cho từng forum ──
  for (const slug of Object.keys(forumIds)) {
    const id = forumIds[slug];
    const threadCount = await db.thread.count({ where: { forumId: id } });
    const replyCount = await db.reply.count({ where: { thread: { forumId: id } } });
    await db.forum.update({ where: { id }, data: { threadCount, replyCount } });
  }

  // ── Tuyên bố bản quyền (hiển thị trên khung mua hàng) ──
  await db.siteSetting.upsert({
    where: { key: 'copyright_notice' },
    update: {},
    create: {
      key: 'copyright_notice',
      value: [
        'Tài nguyên trên Nova chỉ dùng cho mục đích học tập và tham khảo cá nhân.',
        'Nghiêm cấm mua đi bán lại hoặc phát tán lại dưới mọi hình thức khi chưa được phép.',
        'Nếu tài nguyên vi phạm bản quyền của bạn, hãy liên hệ để được gỡ bỏ.',
      ],
    },
  });

  // ── Bình luận mẫu ──
  const premium = await db.post.findUnique({ where: { slug: 'bo-tai-nguyen-premium' }, select: { id: true } });
  if (premium && (await db.comment.count({ where: { postId: premium.id } })) === 0) {
    const root = await db.comment.create({
      data: { postId: premium.id, authorId: admin.id, content: 'Bộ tài nguyên rất chất lượng, cảm ơn tác giả đã chia sẻ!', pinned: true },
    });
    await db.comment.create({
      data: { postId: premium.id, authorId: admin.id, parentId: root.id, content: 'Cảm ơn bạn đã ủng hộ 💙' },
    });
    await db.post.update({ where: { id: premium.id }, data: { commentCount: 2 } });
  }


  // ══════════════════════════════════════════════════════════
  // GAME HUB — thể loại, dòng máy, độ phân giải, emulator, game
  // ══════════════════════════════════════════════════════════

  // ── Thể loại ──
  const genreDefs = [
    { slug: 'action', name: 'Action', icon: '💥', color: '#ef4444' },
    { slug: 'rpg', name: 'RPG', icon: '🗡️', color: '#8b5cf6' },
    { slug: 'strategy', name: 'Strategy', icon: '♟️', color: '#0ea5e9' },
    { slug: 'racing', name: 'Racing', icon: '🏎️', color: '#2c7bfe' },
    { slug: 'sports', name: 'Sports', icon: '⚽', color: '#10b981' },
    { slug: 'puzzle', name: 'Puzzle', icon: '🧩', color: '#f59e0b' },
    { slug: 'arcade', name: 'Arcade', icon: '🕹️', color: '#ec4899' },
    { slug: 'simulation', name: 'Simulation', icon: '🚜', color: '#14b8a6' },
    { slug: 'casual', name: 'Casual', icon: '🎈', color: '#a3a3a3' },
    { slug: 'adventure', name: 'Adventure', icon: '🧭', color: '#22c55e' },
  ];
  const genreIds: Record<string, string> = {};
  for (const [i, g] of genreDefs.entries()) {
    const row = await db.gameGenre.upsert({
      where: { slug: g.slug },
      update: { name: g.name, icon: g.icon, color: g.color, order: i },
      create: { ...g, order: i },
    });
    genreIds[g.slug] = row.id;
  }

  // ── Dòng máy ──
  const platformDefs = [
    { slug: 'nokia-s40', name: 'Nokia S40' },
    { slug: 'nokia-s60', name: 'Nokia S60' },
    { slug: 'sony-ericsson', name: 'Sony Ericsson' },
    { slug: 'samsung', name: 'Samsung' },
    { slug: 'motorola', name: 'Motorola' },
    { slug: 'generic-java-me', name: 'Generic Java ME' },
  ];
  const platformIds: Record<string, string> = {};
  for (const [i, p] of platformDefs.entries()) {
    const row = await db.gamePlatform.upsert({
      where: { slug: p.slug },
      update: { name: p.name, order: i },
      create: { ...p, order: i },
    });
    platformIds[p.slug] = row.id;
  }

  // ── Độ phân giải ──
  const resDefs = [
    { slug: '128x160', label: '128 × 160', width: 128, height: 160 },
    { slug: '176x208', label: '176 × 208', width: 176, height: 208 },
    { slug: '176x220', label: '176 × 220', width: 176, height: 220 },
    { slug: '240x320', label: '240 × 320', width: 240, height: 320 },
    { slug: '320x240', label: '320 × 240', width: 320, height: 240 },
    { slug: '360x640', label: '360 × 640', width: 360, height: 640 },
    { slug: 'custom', label: 'Tuỳ chọn', width: 0, height: 0, custom: true },
  ];
  const resIds: Record<string, string> = {};
  for (const [i, r] of resDefs.entries()) {
    const row = await db.gameResolution.upsert({
      where: { slug: r.slug },
      update: { label: r.label, width: r.width, height: r.height, order: i },
      create: { ...r, order: i },
    });
    resIds[r.slug] = row.id;
  }

  // ── Emulator profile ──
  const runtimeUrl = process.env.EMU_RUNTIME_URL || null;
  const profileDefs = [
    {
      slug: 'nokia-s40-240x320', name: 'Nokia S40 240x320', vendor: 'Nokia',
      screenWidth: 240, screenHeight: 320, keyLayout: 'nokia', saveState: true,
    },
    {
      slug: 'nokia-s60-176x208', name: 'Nokia S60 176x208', vendor: 'Nokia',
      screenWidth: 176, screenHeight: 208, keyLayout: 'nokia',
    },
    {
      slug: 'sony-ericsson-176x220', name: 'Sony Ericsson 176x220', vendor: 'Sony Ericsson',
      screenWidth: 176, screenHeight: 220, keyLayout: 'sonyericsson',
    },
    {
      slug: 'samsung-240x320', name: 'Samsung 240x320', vendor: 'Samsung',
      screenWidth: 240, screenHeight: 320, keyLayout: 'samsung',
    },
    {
      slug: 'generic-320x240', name: 'Generic Java ME 320x240', vendor: null,
      screenWidth: 320, screenHeight: 240, orientation: 'LANDSCAPE' as const, keyLayout: 'generic',
    },
  ];
  const profileIds: Record<string, string> = {};
  for (const p of profileDefs) {
    const row = await db.emulatorProfile.upsert({
      where: { slug: p.slug },
      update: { name: p.name, screenWidth: p.screenWidth, screenHeight: p.screenHeight },
      create: { ...p, runtimeUrl },
    });
    profileIds[p.slug] = row.id;
  }

  // ── Game mẫu ──
  interface SeedGame {
    slug: string; title: string; titleVi?: string; series?: string;
    genres: string[]; platform: string; resolution: string; profile: string;
    developer: string; publisher: string; year: number;
    language: string; vietnamized: boolean; featured: boolean; playOnline: boolean;
    description: string; gameplay: string;
    versions: { version: string; sizeKb: number; latest: boolean; playOnline: boolean; changelog: string; date: string }[];
    stats: { views: number; downloads: number; plays: number; ratingSum: number; ratingCount: number };
  }

  const seedGames: SeedGame[] = [
    {
      slug: 'contra-4', title: 'Contra 4', titleVi: 'Contra 4 Việt hóa', series: 'Contra',
      genres: ['action', 'arcade'], platform: 'nokia-s40', resolution: '240x320', profile: 'nokia-s40-240x320',
      developer: 'Konami Mobile', publisher: 'Konami', year: 2008,
      language: 'vi', vietnamized: true, featured: true, playOnline: true,
      description: 'Bản Java ME của dòng game bắn súng đi cảnh kinh điển. Hai người lính lao vào căn cứ ngoài hành tinh với kho vũ khí nâng cấp liên tục.',
      gameplay: 'Đi cảnh ngang, nhặt icon để đổi súng (S – lan toả, L – laser, M – liên thanh). Ba mạng mỗi lượt chơi, gặp trùm ở cuối mỗi màn.',
      versions: [
        { version: '1.0.0', sizeKb: 412, latest: false, playOnline: false, changelog: 'Bản phát hành đầu tiên.', date: '2008-06-12' },
        { version: '1.2.0', sizeKb: 486, latest: true, playOnline: true, changelog: 'Việt hóa toàn bộ menu, sửa lỗi treo ở màn 5, thêm chế độ luyện tập.', date: '2011-03-04' },
      ],
      stats: { views: 48200, downloads: 12400, plays: 8600, ratingSum: 1880, ratingCount: 412 },
    },
    {
      slug: 'asphalt-urban', title: 'Asphalt Urban GT', series: 'Asphalt',
      genres: ['racing'], platform: 'nokia-s60', resolution: '176x208', profile: 'nokia-s60-176x208',
      developer: 'Gameloft', publisher: 'Gameloft', year: 2004,
      language: 'en', vietnamized: false, featured: true, playOnline: true,
      description: 'Đua xe đường phố với 20 mẫu xe có giấy phép và các thành phố lớn trên thế giới.',
      gameplay: 'Đua theo giải, thắng để mở xe mới. Phím 5 tăng tốc, 0 phanh gấp, phím mềm trái dùng nitro.',
      versions: [
        { version: '2.1.0', sizeKb: 318, latest: true, playOnline: true, changelog: 'Tối ưu khung hình trên máy S60.', date: '2005-09-20' },
      ],
      stats: { views: 31500, downloads: 9800, plays: 5400, ratingSum: 1290, ratingCount: 310 },
    },
    {
      slug: 'bounce-tales', title: 'Bounce Tales', titleVi: 'Quả bóng phiêu lưu',
      genres: ['adventure', 'arcade'], platform: 'nokia-s40', resolution: '240x320', profile: 'nokia-s40-240x320',
      developer: 'Rovio Mobile', publisher: 'Nokia', year: 2008,
      language: 'vi', vietnamized: true, featured: true, playOnline: true,
      description: 'Quả bóng đỏ lăn qua các màn vật lý đầy bẫy, nước và cơ quan để cứu ngôi làng.',
      gameplay: 'Điều khiển bóng bằng phím trái/phải, phím lên để nhảy. Nhặt vật phẩm để phóng to, thu nhỏ hoặc trở nên nặng hơn.',
      versions: [
        { version: '1.0.5', sizeKb: 240, latest: true, playOnline: true, changelog: 'Việt hóa lời thoại, cân bằng lại độ khó màn 8.', date: '2010-01-15' },
      ],
      stats: { views: 62800, downloads: 21300, plays: 15900, ratingSum: 2340, ratingCount: 498 },
    },
    {
      slug: 'snake-xenzia', title: 'Snake Xenzia', series: 'Snake',
      genres: ['arcade', 'casual'], platform: 'nokia-s40', resolution: '128x160', profile: 'nokia-s40-240x320',
      developer: 'Nokia', publisher: 'Nokia', year: 2002,
      language: 'en', vietnamized: false, featured: false, playOnline: true,
      description: 'Bản Snake huyền thoại đi kèm điện thoại Nokia — càng ăn càng dài, chạm đuôi là thua.',
      gameplay: 'Bốn phím hướng điều khiển rắn. Ăn mồi để dài ra và tăng điểm, tránh tường và chính thân mình.',
      versions: [
        { version: '1.0.0', sizeKb: 64, latest: true, playOnline: true, changelog: 'Bản gốc.', date: '2002-05-01' },
      ],
      stats: { views: 88400, downloads: 30100, plays: 42600, ratingSum: 2100, ratingCount: 460 },
    },
    {
      slug: 'dragon-hunter', title: 'Dragon Hunter', titleVi: 'Thợ săn rồng',
      genres: ['rpg', 'adventure'], platform: 'sony-ericsson', resolution: '176x220', profile: 'sony-ericsson-176x220',
      developer: 'In-Fusio', publisher: 'In-Fusio', year: 2006,
      language: 'vi', vietnamized: true, featured: false, playOnline: true,
      description: 'Nhập vai theo lượt trong thế giới trung cổ: nhận nhiệm vụ, rèn trang bị và hạ gục rồng.',
      gameplay: 'Di chuyển trên bản đồ ô vuông, đánh theo lượt. Phím 5 xác nhận, phím mềm phải mở túi đồ.',
      versions: [
        { version: '1.1.2', sizeKb: 690, latest: true, playOnline: true, changelog: 'Sửa lỗi mất save khi thoát giữa trận.', date: '2007-11-30' },
      ],
      stats: { views: 19700, downloads: 6100, plays: 3300, ratingSum: 780, ratingCount: 180 },
    },
    {
      slug: 'chess-master', title: 'Chess Master',
      genres: ['strategy', 'puzzle'], platform: 'generic-java-me', resolution: '320x240', profile: 'generic-320x240',
      developer: 'Mobile Chess Studio', publisher: 'MCS', year: 2009,
      language: 'multi', vietnamized: false, featured: false, playOnline: true,
      description: 'Cờ vua với 10 mức độ máy, chế độ hai người trên cùng một máy và bộ bài tập chiếu hết.',
      gameplay: 'Con trỏ di chuyển bằng phím hướng, phím 5 chọn quân và ô đích. Có gợi ý nước đi và hoàn tác.',
      versions: [
        { version: '3.0.1', sizeKb: 155, latest: true, playOnline: true, changelog: 'Engine mạnh hơn, thêm 40 bài tập.', date: '2011-08-08' },
      ],
      stats: { views: 12300, downloads: 4200, plays: 2100, ratingSum: 620, ratingCount: 140 },
    },
    {
      slug: 'farm-frenzy', title: 'Farm Frenzy', titleVi: 'Nông trại vui vẻ',
      genres: ['simulation', 'casual'], platform: 'samsung', resolution: '240x320', profile: 'samsung-240x320',
      developer: 'Alawar', publisher: 'Alawar Entertainment', year: 2010,
      language: 'vi', vietnamized: true, featured: false, playOnline: false,
      description: 'Quản lý nông trại: nuôi gà, thu trứng, chế biến và bán hàng trước khi hết giờ.',
      gameplay: 'Chạm/di chuyển con trỏ để thu hoạch. Mỗi màn có mục tiêu sản lượng và giới hạn thời gian.',
      versions: [
        { version: '1.0.0', sizeKb: 980, latest: true, playOnline: false, changelog: 'Bản Việt hóa đầu tiên, chỉ hỗ trợ tải về.', date: '2012-02-20' },
      ],
      stats: { views: 25400, downloads: 11200, plays: 0, ratingSum: 1020, ratingCount: 240 },
    },
    {
      slug: 'sudoku-classic', title: 'Sudoku Classic',
      genres: ['puzzle', 'casual'], platform: 'generic-java-me', resolution: '176x220', profile: 'sony-ericsson-176x220',
      developer: 'Puzzle Works', publisher: 'Puzzle Works', year: 2007,
      language: 'en', vietnamized: false, featured: false, playOnline: true,
      description: 'Hơn 500 câu đố Sudoku bốn mức độ, có kiểm tra lỗi và ghi chú nháp.',
      gameplay: 'Phím số điền giá trị, phím 0 xoá ô, phím mềm trái bật ghi chú.',
      versions: [
        { version: '2.4.0', sizeKb: 96, latest: true, playOnline: true, changelog: 'Thêm 200 câu đố và thống kê thời gian giải.', date: '2009-04-17' },
      ],
      stats: { views: 9400, downloads: 3100, plays: 4800, ratingSum: 430, ratingCount: 96 },
    },
  ];

  const gameIds: Record<string, string> = {};
  for (const g of seedGames) {
    const published = new Date(g.versions.at(-1)!.date);
    const game = await db.game.upsert({
      where: { slug: g.slug },
      update: { title: g.title, status: 'PUBLISHED' },
      create: {
        slug: g.slug,
        title: g.title,
        titleVi: g.titleVi ?? null,
        series: g.series ?? null,
        description: g.description,
        gameplay: g.gameplay,
        icon: `games/${g.slug}/icon.svg`,
        developer: g.developer,
        publisher: g.publisher,
        releaseYear: g.year,
        language: g.language,
        vietnamized: g.vietnamized,
        featured: g.featured,
        playOnline: g.playOnline,
        status: 'PUBLISHED',
        publishedAt: published,
        platformId: platformIds[g.platform],
        resolutionId: resIds[g.resolution],
        emulatorProfileId: profileIds[g.profile],
        controls: [
          { key: '↑ ↓ ← →', action: 'Di chuyển' },
          { key: '5 / Enter', action: 'Chọn · Hành động chính' },
          { key: 'Phím mềm trái', action: 'Menu / Options' },
          { key: 'Phím mềm phải', action: 'Quay lại' },
        ],
        compatibilityNote: `Chạy tốt trên profile ${g.profile}. Máy có độ phân giải khác có thể bị co giãn khung hình.`,
        viewCount: g.stats.views,
        uniqueViewCount: Math.round(g.stats.views * 0.62),
        downloadCount: g.stats.downloads,
        uniqueDownloadCount: Math.round(g.stats.downloads * 0.71),
        playCount: g.stats.plays,
        uniquePlayerCount: Math.round(g.stats.plays * 0.44),
        playSeconds: g.stats.plays * 260,
        ratingSum: g.stats.ratingSum,
        ratingCount: g.stats.ratingCount,
        trendingScore: Math.round((g.stats.plays / 100 + g.stats.downloads / 200) * 10) / 10,
      },
    });
    gameIds[g.slug] = game.id;

    // Thể loại
    for (const slug of g.genres) {
      const genreId = genreIds[slug];
      if (!genreId) continue;
      await db.genresOnGames.upsert({
        where: { gameId_genreId: { gameId: game.id, genreId } },
        update: {},
        create: { gameId: game.id, genreId },
      });
    }

    // Ảnh chụp màn hình
    if ((await db.gameImage.count({ where: { gameId: game.id } })) === 0) {
      await db.gameImage.createMany({
        data: [1, 2].map((n) => ({
          gameId: game.id,
          type: 'SCREENSHOT' as const,
          storageKey: `games/${g.slug}/shot-${n}.svg`,
          caption: `${g.title} — màn hình ${n}`,
          width: 240,
          height: 320,
          sortOrder: n,
        })),
      });
    }

    // Version + file JAR/JAD
    for (const v of g.versions) {
      const version = await db.gameVersion.upsert({
        where: { gameId_version: { gameId: game.id, version: v.version } },
        update: { latest: v.latest, playOnline: v.playOnline },
        create: {
          gameId: game.id,
          version: v.version,
          releaseDate: new Date(v.date),
          changelog: v.changelog,
          sizeBytes: BigInt(v.sizeKb * 1024),
          latest: v.latest,
          playOnline: v.playOnline,
        },
      });

      for (const type of ['JAR', 'JAD'] as const) {
        const sizeBytes = type === 'JAR' ? BigInt(v.sizeKb * 1024) : BigInt(1024);
        await db.gameFile.upsert({
          where: { versionId_type: { versionId: version.id, type } },
          update: {},
          create: {
            versionId: version.id,
            type,
            storageKey: `${g.slug}/${v.version}/${g.slug}.${type.toLowerCase()}`,
            fileName: `${g.slug}-${v.version}.${type.toLowerCase()}`,
            sizeBytes,
            // Checksum mẫu — thay bằng giá trị thật khi upload file lên storage.
            checksum: type === 'JAR' ? sha256Hex(`${g.slug}-${v.version}`) : null,
            scanStatus: 'CLEAN',
          },
        });
      }

      // Ma trận tương thích cho version mới nhất
      if (v.latest && v.playOnline) {
        const profileId = profileIds[g.profile]!;
        const exists = await db.gameEmulatorProfile.findFirst({
          where: { gameId: game.id, versionId: version.id, profileId },
        });
        if (!exists) {
          await db.gameEmulatorProfile.create({
            data: { gameId: game.id, versionId: version.id, profileId, support: 'FULL' },
          });
        }
      }
    }
  }

  // ── Bộ sưu tập ──
  const collectionDefs = [
    {
      slug: 'huyen-thoai-nokia', name: 'Huyền thoại Nokia', featured: true,
      description: 'Những tựa game gắn liền với thời điện thoại phím bấm.',
      games: ['snake-xenzia', 'bounce-tales', 'contra-4'],
    },
    {
      slug: 'ban-viet-hoa', name: 'Bản Việt hóa tuyển chọn', featured: true,
      description: 'Game đã được dịch trọn vẹn sang tiếng Việt.',
      games: ['contra-4', 'bounce-tales', 'dragon-hunter', 'farm-frenzy'],
    },
    {
      slug: 'giai-tri-nhe-nhang', name: 'Giải trí nhẹ nhàng', featured: false,
      description: 'Chơi vài phút lúc rảnh, không cần cày cuốc.',
      games: ['sudoku-classic', 'snake-xenzia', 'chess-master'],
    },
  ];
  for (const [i, c] of collectionDefs.entries()) {
    const col = await db.gameCollection.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, featured: c.featured, order: i },
      create: { slug: c.slug, name: c.name, description: c.description, featured: c.featured, order: i },
    });
    for (const [j, slug] of c.games.entries()) {
      const gameId = gameIds[slug];
      if (!gameId) continue;
      await db.gamesOnCollections.upsert({
        where: { gameId_collectionId: { gameId, collectionId: col.id } },
        update: { order: j },
        create: { gameId, collectionId: col.id, order: j },
      });
    }
  }

  console.log('✅ Seed hoàn tất. Admin: admin@nova.local / admin123');
}

main().then(() => db.$disconnect()).catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
