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

  console.log('✅ Seed hoàn tất. Admin: admin@nova.local / admin123');
}

main().then(() => db.$disconnect()).catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
