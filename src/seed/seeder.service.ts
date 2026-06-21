import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AvatarSlot, ConsumableType, MinigameType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FISH_SPECIES, FISH_DEPTHS, FISHING_RODS, FISHING_BOATS } from './data/fishing.data';
import { CROPS, FERTILIZERS, ANIMALS } from './data/farm.data';
import { FOODS } from './data/foods.data';
import { WARDROBE_ITEMS } from './data/wardrobe.data';
import { TOOL_CATEGORIES, TOOLS, SERVER_TOOLS } from './data/tools.data';
import { AI_CHARACTER, AI_OUTFITS } from './data/ai-character.data';
import { DEFAULT_GROUPS } from '../modules/permissions/permission.service';
import { AdminConfigService } from '../modules/admin/admin-config.service';

// Tự seed dữ liệu mẫu (cá/cây/phân/vật nuôi/công thức/đồ ăn/wardrobe) khi app khởi động.
// Data nằm thẳng trong src/seed/data — không cần chạy lệnh seed thủ công.
// Tắt bằng env AUTO_SEED=false.
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminConfig: AdminConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.AUTO_SEED === 'false') return;
    try {
      await this.seedAll();
    } catch (e) {
      // Không chặn app nếu DB chưa migrate — chỉ cảnh báo
      this.logger.warn(`Auto-seed bỏ qua: ${(e as Error).message}`);
    }
  }

  private async seedAll() {
    let n = 0;

    // Nhóm cấu hình hệ thống (AI, Thanh toán, Media...) — admin chỉnh trong UI.
    // upsert giữ nguyên value admin đã đặt, chỉ thêm key/nhóm mới.
    await this.adminConfig.seedDefaults();

    // Nhóm hệ thống + bộ quyền (Flarum-style). Cập nhật tên/màu nhưng giữ permissions nếu admin đã sửa.
    for (const g of DEFAULT_GROUPS) {
      await this.prisma.userGroup.upsert({
        where: { key: g.key },
        update: { name: g.name, color: g.color, priority: g.priority, isSystem: true },
        create: { key: g.key, name: g.name, color: g.color, priority: g.priority, isSystem: true, permissions: g.permissions },
      });
      n++;
    }

    // Trang tĩnh mặc định (nội quy, riêng tư, trợ giúp, cookie) — chỉ tạo khi thiếu, giữ bản admin đã sửa
    try {
      const DEFAULT_PAGES = [
        { slug: 'noi-quy', title: 'Nội quy & quy định', sortOrder: 1, content:
`# Nội quy & quy định

Chào mừng bạn đến với cộng đồng! Vui lòng tuân thủ các quy định sau để giữ một môi trường lành mạnh:

1. **Tôn trọng lẫn nhau** — không công kích, xúc phạm, phân biệt đối xử.
2. **Không spam** — không đăng quảng cáo, liên kết rác, nội dung lặp lại.
3. **Không lừa đảo** — nghiêm cấm mọi hành vi lừa đảo, chiếm đoạt tài sản.
4. **Nội dung phù hợp** — không đăng nội dung vi phạm pháp luật, đồi trụy, bạo lực.
5. **Bản quyền** — chỉ chia sẻ nội dung bạn có quyền chia sẻ.

Vi phạm có thể bị **cảnh cáo, tắt tiếng hoặc cấm vĩnh viễn** tùy mức độ. Quyết định của Ban quản trị là cuối cùng.` },
        { slug: 'quyen-rieng-tu', title: 'Chính sách quyền riêng tư', sortOrder: 2, content:
`# Chính sách quyền riêng tư

Chúng tôi tôn trọng quyền riêng tư của bạn.

- **Dữ liệu thu thập**: tên đăng nhập, email, ảnh đại diện và nội dung bạn đăng.
- **Mục đích**: vận hành diễn đàn, xác thực tài khoản, gửi thông báo bạn đã bật.
- **Chia sẻ**: chúng tôi không bán dữ liệu cá nhân cho bên thứ ba.
- **Cookie**: dùng cookie để duy trì đăng nhập và ghi nhớ tuỳ chọn giao diện.
- **Quyền của bạn**: bạn có thể chỉnh sửa hồ sơ hoặc yêu cầu xoá tài khoản bất cứ lúc nào.

Khi tiếp tục sử dụng website, bạn đồng ý với chính sách này.` },
        { slug: 'tro-giup', title: 'Trợ giúp', sortOrder: 3, content:
`# Trợ giúp

**Câu hỏi thường gặp**

- **Đăng ký / đăng nhập**: bấm "Đăng ký" ở góc phải, điền thông tin và xác thực email (nếu được bật).
- **Đổi ảnh đại diện**: vào Cài đặt → Ảnh đại diện, tải ảnh lên hoặc chọn từ thư viện.
- **Đăng bài**: vào một chuyên mục và bấm "Tạo chủ đề".
- **Nhắc ai đó (@)**: gõ @ rồi chọn tên người dùng trong bài viết hoặc khung chat.
- **Thông báo**: bật/tắt email thông báo trong phần cài đặt tài khoản.

Cần hỗ trợ thêm? Hãy liên hệ Ban quản trị qua trang cá nhân của admin.` },
        { slug: 'cookies', title: 'Chính sách Cookie', sortOrder: 4, content:
`# Chính sách Cookie

Website sử dụng cookie để:

- Duy trì phiên đăng nhập của bạn.
- Ghi nhớ tuỳ chọn giao diện (sáng/tối) và một số lựa chọn cá nhân.
- Phục vụ thống kê ẩn danh nhằm cải thiện trải nghiệm.

Bạn có thể chấp nhận cookie qua thanh thông báo, hoặc quản lý/xoá cookie trong cài đặt trình duyệt. Việc tắt cookie có thể khiến một số tính năng (như đăng nhập) không hoạt động.` },
      ];
      for (const p of DEFAULT_PAGES) {
        await this.prisma.page.upsert({ where: { slug: p.slug }, update: {}, create: { ...p, isPublished: true, showInNav: false } });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed trang tĩnh lỗi: ${(e as Error).message}`); }

    // Bọc từng phần để 1 lỗi không chặn các phần seed sau (vd: icon/minigame không cập nhật)
    try {
      // update: {} -> chỉ thêm khi thiếu, KHÔNG ghi đè dữ liệu admin đã sửa
      for (const f of FISH_SPECIES) {
        await this.prisma.fishSpecies.upsert({
          where: { slug: f.slug },
          update: {},
          create: { ...f, stock: f.refillCount },
        });
        n++;
      }
      // Độ sâu hồ + cần câu + thuyền (admin sửa được sau)
      for (const d of FISH_DEPTHS) {
        await this.prisma.fishDepth.upsert({ where: { depth: d.depth }, update: {}, create: d });
        n++;
      }
      for (const r of FISHING_RODS) {
        await this.prisma.fishingRod.upsert({ where: { slug: r.slug }, update: {}, create: r });
        n++;
      }
      for (const b of FISHING_BOATS) {
        await this.prisma.fishingBoat.upsert({ where: { slug: b.slug }, update: {}, create: b });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed fishSpecies lỗi: ${(e as Error).message}`); }

    // Reset 1 lần: xoá roster cây/thú/công thức cũ, thay bằng pack mới (chỉ chạy khi còn dữ liệu cũ)
    try { await this.resetFarmRosterIfNeeded(); } catch (e) { this.logger.warn(`Reset farm roster lỗi: ${(e as Error).message}`); }

    try {
      for (const c of CROPS) {
        await this.prisma.cropTemplate.upsert({ where: { slug: c.slug }, update: {}, create: c });
        // Thay asset cũ (/sv1) hoặc trống bằng sprite pixel mới — giữ icon admin tự tải lên
        await this.prisma.cropTemplate.updateMany({
          where: { slug: c.slug, OR: [{ asset: { contains: '/sv1/' } }, { asset: null }, { asset: '' }] },
          data: { asset: c.asset },
        });
        n++;
      }
      for (const fz of FERTILIZERS) {
        await this.prisma.fertilizerTemplate.upsert({ where: { slug: fz.slug }, update: {}, create: fz });
        n++;
      }
      for (const a of ANIMALS) {
        await this.prisma.animalTemplate.upsert({ where: { slug: a.slug }, update: {}, create: a });
        // Thay sprite thú cũ (vatnuoi/pixel-animals) hoặc trống bằng sprite GHAP mới; giữ ảnh admin tự tải
        await this.prisma.animalTemplate.updateMany({
          where: { slug: a.slug, OR: [{ asset: { contains: 'vatnuoi' } }, { asset: { contains: 'pixel-animals' } }, { asset: null }, { asset: '' }] },
          data: { asset: a.asset },
        });
        n++;
      }
      // Lợn/Bò chuyển sang cho THỊT (migrate dữ liệu cũ: lợn chưa có sản phẩm, bò còn sữa)
      await this.prisma.animalTemplate.updateMany({ where: { slug: 'lon', OR: [{ productSlug: null }, { productSlug: { not: 'thit-heo' } }] }, data: { productSlug: 'thit-heo', productName: 'Thịt heo', productYield: 2, productPrice: 400 } });
      await this.prisma.animalTemplate.updateMany({ where: { slug: 'bo', OR: [{ productSlug: null }, { productSlug: { not: 'thit-bo' } }] }, data: { productSlug: 'thit-bo', productName: 'Thịt bò', productYield: 2, productPrice: 600, name: 'Bò' } });
    } catch (e) { this.logger.warn(`Seed farm lỗi: ${(e as Error).message}`); }

    // ── Minigame configs (nếu thiếu sẽ báo "Game không khả dụng") ──
    const MINIGAMES: { type: MinigameType; name: string; minBet: number; maxBet: number; minPlayers: number; maxPlayers: number; sortOrder: number }[] = [
      { type: 'TAI_XIU', name: 'Tài Xỉu', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 0 },
      { type: 'BAU_CUA', name: 'Bầu Cua', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 1 },
      { type: 'COIN_FLIP', name: 'Tung Xu', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 2 },
      { type: 'LUCKY_WHEEL', name: 'Vòng Quay', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 3 },
      { type: 'DUA_THU', name: 'Đua Thú', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 4 },
      { type: 'JACKPOT_777', name: 'Jackpot 777', minBet: 100, maxBet: 20000, minPlayers: 1, maxPlayers: 1, sortOrder: 5 },
      { type: 'BLACKJACK', name: 'Blackjack', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 6 },
      { type: 'POKER', name: 'Poker', minBet: 100, maxBet: 50000, minPlayers: 2, maxPlayers: 6, sortOrder: 7 },
      { type: 'TIEN_LEN', name: 'Tiến Lên', minBet: 100, maxBet: 50000, minPlayers: 2, maxPlayers: 4, sortOrder: 8 },
      { type: 'CARO', name: 'Cờ Caro', minBet: 100, maxBet: 50000, minPlayers: 2, maxPlayers: 2, sortOrder: 9 },
    ];
    try {
      for (const m of MINIGAMES) {
        await this.prisma.minigameConfig.upsert({
          where: { type: m.type },
          update: { name: m.name, isActive: true },
          create: { ...m, houseFee: 0.05, isActive: true },
        });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed minigame lỗi: ${(e as Error).message}`); }

    for (const food of FOODS) {
      const data = { ...food, type: food.type as ConsumableType };
      await this.prisma.consumableTemplate.upsert({ where: { slug: food.slug }, update: {}, create: data });
      n++;
    }

    for (const w of WARDROBE_ITEMS) {
      const data = { ...w, slot: w.slot as AvatarSlot };
      await this.prisma.avatarItemTemplate.upsert({ where: { slug: w.slug }, update: data, create: data });
      n++;
    }

    // Tools Collection
    const catId = new Map<string, string>();
    for (const c of TOOL_CATEGORIES) {
      const cat = await this.prisma.toolCategory.upsert({
        where: { slug: c.slug },
        update: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder },
        create: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder, slug: c.slug },
      });
      catId.set(c.slug, cat.id);
      n++;
    }
    for (const t of [...TOOLS, ...SERVER_TOOLS]) {
      const categoryId = catId.get(t.categorySlug);
      if (!categoryId) continue;
      const data = {
        categoryId, name: t.name, description: t.description, icon: t.icon,
        component: t.component, serverEngine: t.serverEngine ?? null, isPro: t.isPro ?? false, sortOrder: t.sortOrder,
      };
      await this.prisma.tool.upsert({ where: { slug: t.slug }, update: data, create: { ...data, slug: t.slug } });
      n++;
    }

    // ── Nhân vật AI Live2D + trang phục mở dần theo bond ──
    const character = await this.prisma.aiCharacter.upsert({
      where: { slug: AI_CHARACTER.slug },
      update: {
        name: AI_CHARACTER.name, description: AI_CHARACTER.description,
        defaultOutfit: AI_CHARACTER.defaultOutfit, emotionMap: AI_CHARACTER.emotionMap,
        sortOrder: AI_CHARACTER.sortOrder,
      },
      create: {
        slug: AI_CHARACTER.slug, name: AI_CHARACTER.name, description: AI_CHARACTER.description,
        defaultOutfit: AI_CHARACTER.defaultOutfit, emotionMap: AI_CHARACTER.emotionMap,
        sortOrder: AI_CHARACTER.sortOrder,
      },
    });
    n++;
    for (const o of AI_OUTFITS) {
      const data = { ...o, isDefault: o.slug === AI_CHARACTER.defaultOutfit };
      await this.prisma.aiOutfit.upsert({
        where: { characterId_slug: { characterId: character.id, slug: o.slug } },
        update: data,
        create: { ...data, characterId: character.id },
      });
      n++;
    }
    // Persona mặc định (tạo nếu chưa có) + gắn vào character này để chat tích bond
    const existingPersona = await this.prisma.aiPersona.findFirst({ where: { isDefault: true } });
    if (!existingPersona) {
      await this.prisma.aiPersona.create({
        data: {
          name: 'Minori',
          systemPrompt:
            'Bạn là Minori, một trợ lý AI anime dễ thương và thân thiện của diễn đàn.\n' +
            'Bạn nói tiếng Việt, vui vẻ, hay giúp đỡ thành viên về các vấn đề kỹ thuật, lập trình, game.\n' +
            'Tính cách: năng động, đáng yêu, đôi khi nghịch ngợm nhưng luôn nhiệt tình giúp đỡ.',
          provider: 'GEMINI',
          modelId: 'gemini-2.0-flash',
          greetingText: 'Xin chào! Mình là Minori~ Có gì mình giúp được không nè? 🌸',
          live2dModel: AI_OUTFITS[0].modelPath,
          isDefault: true,
          isActive: true,
          characterId: character.id,
        },
      });
      n++;
    } else {
      await this.prisma.aiPersona.updateMany({
        where: { isDefault: true, characterId: null },
        data: { characterId: character.id },
      });
    }

    // ── Huy hiệu mốc mặc định (milestone badges, isAuto) ──
    const DEFAULT_BADGES = [
      { id: 'badge-first-post', name: 'Bài viết đầu tiên', icon: 'PenLine', color: 'green', condition: { type: 'postCount', gte: 1 } },
      { id: 'badge-active-100', name: 'Cây bút năng nổ', icon: 'Pen', color: 'blue', condition: { type: 'postCount', gte: 100 } },
      { id: 'badge-rep-1000', name: 'Uy tín ngàn điểm', icon: 'Gem', color: 'violet', condition: { type: 'reputationScore', gte: 1000 } },
      { id: 'badge-threads-50', name: 'Người mở chuyện', icon: 'MessageSquare', color: 'amber', condition: { type: 'threadCount', gte: 50 } },
    ];
    for (const b of DEFAULT_BADGES) {
      const data = { name: b.name, icon: b.icon, color: b.color, condition: b.condition, isAuto: true };
      await this.prisma.badge.upsert({
        where: { id: b.id },
        update: data,
        create: { id: b.id, ...data },
      });
      n++;
    }

    // ── Cấp độ mặc định (level tiers) ──
    const DEFAULT_LEVELS = [
      { level: 1, name: 'Tân binh', icon: 'Sprout', color: 'green', minScore: 0 },
      { level: 2, name: 'Thành viên', icon: 'Leaf', color: 'gray', minScore: 50 },
      { level: 3, name: 'Năng nổ', icon: 'Star', color: 'blue', minScore: 200 },
      { level: 4, name: 'Kỳ cựu', icon: 'Award', color: 'violet', minScore: 600 },
      { level: 5, name: 'Lão làng', icon: 'Crown', color: 'amber', minScore: 1500 },
      { level: 6, name: 'Huyền thoại', icon: 'Trophy', color: 'red', minScore: 4000 },
    ];
    for (const t of DEFAULT_LEVELS) {
      const data = { name: t.name, icon: t.icon, color: t.color, minScore: t.minScore };
      await this.prisma.levelTier.upsert({
        where: { level: t.level },
        update: data,
        create: { level: t.level, ...data },
      });
      n++;
    }

    this.logger.log(`Auto-seed hoàn tất: ${n} bản ghi template`);
  }

  // Xoá roster cây/thú cũ (không thuộc pack mới) — chạy 1 lần khi còn dữ liệu cũ.
  private async resetFarmRosterIfNeeded() {
    const cropSlugs = CROPS.map((c) => c.slug);
    const animalSlugs = ANIMALS.map((a) => a.slug);

    // Có còn cây/thú cũ (ngoài danh sách mới) không?
    const oldCrops = await this.prisma.cropTemplate.count({ where: { slug: { notIn: cropSlugs } } });
    const oldAnimals = await this.prisma.animalTemplate.count({ where: { slug: { notIn: animalSlugs } } });
    if (oldCrops === 0 && oldAnimals === 0) return; // đã sạch, bỏ qua

    this.logger.log('Reset roster nông trại: xoá cây/thú/công thức cũ...');

    // 1) Cây: gỡ cây đang trồng thuộc loại bị xoá rồi xoá template
    const removeCrops = await this.prisma.cropTemplate.findMany({ where: { slug: { notIn: cropSlugs } }, select: { id: true } });
    if (removeCrops.length) {
      const ids = removeCrops.map((c) => c.id);
      await this.prisma.farmPlot.updateMany({
        where: { cropId: { in: ids } },
        data: { cropId: null, plantedAt: null, readyAt: null, watered: false, tilled: false, health: 100, yield: 0 },
      });
      await this.prisma.cropTemplate.deleteMany({ where: { id: { in: ids } } });
    }

    // 2) Thú: xoá thú đang nuôi thuộc loại bị xoá rồi xoá template
    const removeAnimals = await this.prisma.animalTemplate.findMany({ where: { slug: { notIn: animalSlugs } }, select: { id: true } });
    if (removeAnimals.length) {
      const ids = removeAnimals.map((a) => a.id);
      await this.prisma.farmAnimal.deleteMany({ where: { animalId: { in: ids } } });
      await this.prisma.animalTemplate.deleteMany({ where: { id: { in: ids } } });
    }

    // 3) Cập nhật dữ liệu cây/thú giữ lại về đúng pack mới (giá/chỉ số/icon)
    for (const c of CROPS) await this.prisma.cropTemplate.upsert({ where: { slug: c.slug }, update: c, create: c });
    for (const a of ANIMALS) await this.prisma.animalTemplate.upsert({ where: { slug: a.slug }, update: a, create: a });
  }
}
