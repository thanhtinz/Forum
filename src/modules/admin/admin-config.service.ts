import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AdminConfigService {
  // Cache config trong memory để truy cập nhanh
  private cache = new Map<string, any>();
  private cacheLoaded = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────
  // ĐỌC CONFIG (có cache)
  // ──────────────────────────────────────────────
  async get<T = any>(key: string, fallback?: T): Promise<T> {
    if (!this.cacheLoaded) await this.loadCache();
    return this.cache.has(key) ? this.cache.get(key) : (fallback as T);
  }

  async getMany(keys: string[]): Promise<Record<string, any>> {
    if (!this.cacheLoaded) await this.loadCache();
    return Object.fromEntries(keys.map((k) => [k, this.cache.get(k)]));
  }

  /**
   * Lấy giá trị cấu hình theo thứ tự ưu tiên:
   *   1. Giá trị admin đặt trong DB (nếu khác rỗng)
   *   2. Biến môi trường `envKey` (nếu có)
   *   3. `fallback`
   * Dùng cho các service cần đọc cấu hình do admin đặt nhưng vẫn tương thích .env cũ.
   */
  async resolve<T = any>(key: string, envKey?: string, fallback?: T): Promise<T> {
    const dbVal = await this.get<T>(key);
    if (dbVal !== undefined && dbVal !== null && (dbVal as any) !== '') return dbVal;
    if (envKey) {
      const env = process.env[envKey];
      if (env != null && env !== '') return env as unknown as T;
    }
    return fallback as T;
  }

  private async loadCache() {
    const settings = await this.prisma.configSetting.findMany();
    this.cache.clear();
    for (const s of settings) this.cache.set(s.key, s.value);
    this.cacheLoaded = true;
  }

  invalidateCache() {
    this.cacheLoaded = false;
    this.cache.clear();
  }

  // ──────────────────────────────────────────────
  // LẤY TOÀN BỘ CONFIG THEO GROUP (cho admin UI)
  // ──────────────────────────────────────────────
  // Nhóm đã gộp vào trang riêng (không hiện trong menu Cấu hình)
  private readonly HIDDEN_GROUPS = ['payments'];

  async getAllGroups() {
    const groups = await this.prisma.configGroup.findMany({
      where: { key: { notIn: this.HIDDEN_GROUPS } },
      orderBy: { sortOrder: 'asc' },
      include: {
        settings: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Mask secret values
    return groups.map((g) => ({
      ...g,
      settings: g.settings.map((s) => ({
        ...s,
        value: s.isSecret && s.value ? '••••••••' : s.value,
      })),
    }));
  }

  async getGroup(groupKey: string) {
    const group = await this.prisma.configGroup.findUnique({
      where: { key: groupKey },
      include: { settings: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!group) throw new NotFoundException('Nhóm cấu hình không tồn tại');
    return group;
  }

  // ──────────────────────────────────────────────
  // CẬP NHẬT 1 SETTING
  // ──────────────────────────────────────────────
  async updateSetting(key: string, value: any, actorId: string) {
    const setting = await this.prisma.configSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException('Cấu hình không tồn tại');

    this.validateValue(setting, value);

    const before = setting.value;
    const updated = await this.prisma.configSetting.update({
      where: { key },
      data: { value },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'config.update',
        targetType: 'config_setting',
        targetId: key,
        before: { value: before },
        after: { value },
      },
    });

    this.invalidateCache();
    this.events.emit('config.updated', { key, value });

    return updated;
  }

  // ──────────────────────────────────────────────
  // CẬP NHẬT NHIỀU SETTING (batch save form)
  // ──────────────────────────────────────────────
  async updateBatch(updates: { key: string; value: any }[], actorId: string) {
    const results: any[] = [];
    for (const u of updates) {
      const setting = await this.prisma.configSetting.findUnique({ where: { key: u.key } });
      if (!setting) continue;
      // Bỏ qua nếu là secret và value bị mask
      if (setting.isSecret && u.value === '••••••••') continue;
      this.validateValue(setting, u.value);
      results.push(
        this.prisma.configSetting.update({ where: { key: u.key }, data: { value: u.value } }),
      );
    }
    await this.prisma.$transaction(results);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'config.batch_update',
        targetType: 'config_setting',
        after: { count: results.length },
      },
    });

    this.invalidateCache();
    this.events.emit('config.batch_updated', { count: results.length });
    return { updated: results.length };
  }

  // ──────────────────────────────────────────────
  // VALIDATION
  // ──────────────────────────────────────────────
  private validateValue(setting: any, value: any) {
    const v = setting.validation ?? {};
    switch (setting.type) {
      case 'number':
        if (typeof value !== 'number') throw new BadRequestException(`${setting.label} phải là số`);
        if (v.min != null && value < v.min) throw new BadRequestException(`${setting.label} tối thiểu ${v.min}`);
        if (v.max != null && value > v.max) throw new BadRequestException(`${setting.label} tối đa ${v.max}`);
        break;
      case 'boolean':
        if (typeof value !== 'boolean') throw new BadRequestException(`${setting.label} phải là true/false`);
        break;
      case 'string':
      case 'textarea':
      case 'color':
      case 'image':
        if (typeof value !== 'string') throw new BadRequestException(`${setting.label} phải là chuỗi`);
        if (v.pattern && !new RegExp(v.pattern).test(value))
          throw new BadRequestException(`${setting.label} không đúng định dạng`);
        break;
      case 'select':
        const allowed = (setting.options ?? []).map((o: any) => o.value);
        if (!allowed.includes(value)) throw new BadRequestException(`${setting.label} giá trị không hợp lệ`);
        break;
    }
    if (v.required && (value == null || value === '')) {
      throw new BadRequestException(`${setting.label} là bắt buộc`);
    }
  }

  // ──────────────────────────────────────────────
  // SEED CONFIG MẶC ĐỊNH (chạy 1 lần)
  // ──────────────────────────────────────────────
  async seedDefaults() {
    const groups = DEFAULT_CONFIG_GROUPS;
    const validGroupKeys = groups.map((g) => g.key);
    const validSettingKeys: string[] = [];

    for (const g of groups) {
      const group = await this.prisma.configGroup.upsert({
        where: { key: g.key },
        update: { name: g.name, description: g.description, icon: g.icon, sortOrder: g.sortOrder },
        create: { key: g.key, name: g.name, description: g.description, icon: g.icon, sortOrder: g.sortOrder },
      });
      for (const [i, s] of g.settings.entries()) {
        validSettingKeys.push(s.key);
        await this.prisma.configSetting.upsert({
          where: { key: s.key },
          // Cập nhật metadata (label/type/options…) để đồng bộ với code, NHƯNG giữ nguyên `value` đã set.
          update: {
            groupId: group.id,
            label: s.label,
            description: s.description ?? null,
            type: s.type,
            defaultValue: s.value,
            options: s.options ?? undefined,
            validation: s.validation ?? undefined,
            isSecret: s.isSecret ?? false,
            sortOrder: i,
          },
          create: {
            groupId: group.id,
            key: s.key,
            label: s.label,
            description: s.description,
            type: s.type,
            value: s.value,
            defaultValue: s.value,
            options: s.options ?? undefined,
            validation: s.validation ?? undefined,
            isSecret: s.isSecret ?? false,
            sortOrder: i,
          },
        });
      }
    }

    // Dọn rác: xoá các cấu hình/nhóm không còn trong định nghĩa (tính năng đã bỏ).
    const removedSettings = await this.prisma.configSetting.deleteMany({
      where: { key: { notIn: validSettingKeys } },
    });
    const removedGroups = await this.prisma.configGroup.deleteMany({
      where: { key: { notIn: validGroupKeys } },
    });

    this.invalidateCache();
    return { groups: groups.length, removedSettings: removedSettings.count, removedGroups: removedGroups.count };
  }
}

// ════════════════════════════════════════════════════════════
// ĐỊNH NGHĨA TOÀN BỘ CONFIG — từ nhỏ nhất đến lớn nhất
// ════════════════════════════════════════════════════════════
interface SeedSetting {
  key: string;
  label: string;
  description?: string;
  type: string;
  value: any;
  options?: { label: string; value: any }[];
  validation?: Record<string, any>;
  isSecret?: boolean;
}
interface SeedGroup {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  settings: SeedSetting[];
}

export const DEFAULT_CONFIG_GROUPS: SeedGroup[] = [
  {
    key: 'general',
    name: 'Cài đặt chung',
    description: 'Thông tin cơ bản của website',
    icon: 'settings',
    sortOrder: 1,
    settings: [
      { key: 'site.name', label: 'Tên website', type: 'string', value: 'Forum AI', validation: { required: true } },
      { key: 'site.tagline', label: 'Slogan', type: 'string', value: 'Cộng đồng chia sẻ mã nguồn' },
      { key: 'site.description', label: 'Mô tả (SEO)', type: 'textarea', value: '' },
      { key: 'site.heroTitle', label: 'Tiêu đề Hero (trang chủ)', type: 'string', value: 'Chào mừng đến ForumHub' },
      { key: 'site.heroDescription', label: 'Mô tả Hero (trang chủ)', type: 'textarea', value: 'Diễn đàn cộng đồng tích hợp game hoá — chia sẻ, thảo luận, chơi game và mua bán source code.' },
      { key: 'site.footerText', label: 'Nội dung Footer', type: 'textarea', value: '© {year} ForumHub · NestJS + Next.js' },
      { key: 'site.logo', label: 'Logo lớn (dài, hiện cạnh tên)', type: 'image', value: '' },
      { key: 'site.logoSmall', label: 'Logo nhỏ (thay icon hình thoi)', type: 'image', value: '' },
      { key: 'site.favicon', label: 'Favicon', type: 'image', value: '' },
      { key: 'site.primaryColor', label: 'Màu chủ đạo', type: 'color', value: '#7c3aed' },
      { key: 'site.defaultLanguage', label: 'Ngôn ngữ mặc định', type: 'select', value: 'vi',
        options: [{ label: 'Tiếng Việt', value: 'vi' }, { label: 'English', value: 'en' }] },
      { key: 'site.timezone', label: 'Múi giờ', type: 'string', value: 'Asia/Ho_Chi_Minh' },
      { key: 'site.maintenanceMode', label: 'Chế độ bảo trì', type: 'boolean', value: false },
    ],
  },
  {
    key: 'forum',
    name: 'Diễn đàn',
    description: 'Cấu hình hành vi forum',
    icon: 'message-square',
    sortOrder: 2,
    settings: [
      { key: 'forum.threadsPerPage', label: 'Số thread mỗi trang', type: 'number', value: 20, validation: { min: 5, max: 100 } },
      { key: 'forum.postsPerPage', label: 'Số bài mỗi trang', type: 'number', value: 20, validation: { min: 5, max: 100 } },
      { key: 'forum.minPostLength', label: 'Độ dài bài tối thiểu', type: 'number', value: 10, validation: { min: 1 } },
      { key: 'forum.maxPostLength', label: 'Độ dài bài tối đa', type: 'number', value: 50000, validation: { min: 100 } },
      { key: 'forum.allowGuestView', label: 'Cho khách xem', type: 'boolean', value: true },
      { key: 'forum.requireApproval', label: 'Duyệt bài trước khi đăng', type: 'boolean', value: false },
      { key: 'forum.editTimeLimit', label: 'Giới hạn sửa bài (phút, 0=không giới hạn)', type: 'number', value: 0 },
      { key: 'forum.allowHiddenContent', label: 'Cho phép nội dung ẩn', type: 'boolean', value: true },
      { key: 'forum.maxTagsPerThread', label: 'Số tag tối đa mỗi thread', type: 'number', value: 5, validation: { min: 0, max: 20 } },
    ],
  },
  {
    key: 'hiddenContent',
    name: 'Nội dung ẩn',
    description: 'Giới hạn cho tính năng ẩn nội dung',
    icon: 'lock',
    sortOrder: 3,
    settings: [
      { key: 'hidden.maxLikeRequired', label: 'Số like tối đa được đặt', type: 'number', value: 1000, validation: { min: 1 } },
      { key: 'hidden.maxCommentRequired', label: 'Số comment tối đa được đặt', type: 'number', value: 500, validation: { min: 1 } },
      { key: 'hidden.maxGemPrice', label: 'Giá gem tối đa', type: 'number', value: 10000, validation: { min: 1 } },
      { key: 'hidden.minGemPrice', label: 'Giá gem tối thiểu', type: 'number', value: 1, validation: { min: 1 } },
      { key: 'hidden.authorGemShare', label: 'Tỷ lệ gem tác giả nhận (%)', type: 'number', value: 70, validation: { min: 0, max: 100 } },
      { key: 'hidden.maxSectionsPerPost', label: 'Số section ẩn tối đa mỗi bài', type: 'number', value: 5, validation: { min: 1, max: 20 } },
    ],
  },
  {
    key: 'payments',
    name: 'Thanh toán & Rút tiền',
    description: 'Cấu hình cổng nạp (SePay/PayPal) và ngưỡng rút — quản lý ngay trong trang Nạp tiền.',
    icon: 'credit-card',
    sortOrder: 4,
    settings: [
      { key: 'payment.sepayEnabled', label: 'Bật SePay', type: 'boolean', value: true },
      { key: 'payment.sepayBankAccount', label: 'Số tài khoản SePay', type: 'string', value: '' },
      { key: 'payment.sepayBankName', label: 'Tên ngân hàng', type: 'string', value: '' },
      { key: 'payment.sepayAccountName', label: 'Chủ tài khoản', type: 'string', value: '' },
      { key: 'payment.sepayApiKey', label: 'SePay Webhook API Key', type: 'string', value: '', isSecret: true },
      { key: 'payment.paypalEnabled', label: 'Bật PayPal', type: 'boolean', value: true },
      { key: 'payment.paypalMode', label: 'Chế độ PayPal', type: 'select', value: 'sandbox',
        options: [{ label: 'Sandbox', value: 'sandbox' }, { label: 'Live', value: 'live' }] },
      { key: 'payment.paypalClientId', label: 'PayPal Client ID', type: 'string', value: '', isSecret: true },
      { key: 'payment.paypalSecret', label: 'PayPal Secret', type: 'string', value: '', isSecret: true },
      { key: 'gem.minWithdraw', label: 'Gem tối thiểu để rút', type: 'number', value: 1000, validation: { min: 0 } },
    ],
  },
  {
    key: 'ai',
    name: 'AI hệ thống',
    description: 'Cấu hình AI dùng cho các tính năng của hệ thống (luận giải Tarot, công cụ viết…). Lấy API key ở Google AI Studio (Gemini) hoặc OpenAI.',
    icon: 'sparkles',
    sortOrder: 7,
    settings: [
      { key: 'ai.enabled', label: 'Bật tính năng AI', type: 'boolean', value: true },
      { key: 'ai.defaultProvider', label: 'Provider', type: 'select', value: 'GEMINI',
        options: [{ label: 'OpenAI', value: 'OPENAI' }, { label: 'Gemini', value: 'GEMINI' }, { label: 'Ollama', value: 'OLLAMA' }, { label: 'OpenAI-compatible', value: 'OPENAI_COMPAT' }] },
      { key: 'ai.defaultModel', label: 'Model mặc định', description: 'VD: gemini-2.0-flash, gpt-4o-mini…', type: 'string', value: 'gemini-2.0-flash' },
      { key: 'ai.openaiKey', label: 'OpenAI API Key', type: 'string', value: '', isSecret: true },
      { key: 'ai.geminiKey', label: 'Gemini API Key', type: 'string', value: '', isSecret: true },
      { key: 'ai.openaiBaseUrl', label: 'OpenAI Base URL (cho OpenAI-compatible)', type: 'string', value: '' },
      { key: 'ai.ollamaUrl', label: 'Ollama Base URL', type: 'string', value: 'http://localhost:11434' },
    ],
  },
  {
    key: 'registration',
    name: 'Đăng ký & Đăng nhập',
    description: 'Cấu hình tài khoản',
    icon: 'user-plus',
    sortOrder: 8,
    settings: [
      { key: 'auth.allowRegistration', label: 'Cho phép đăng ký', type: 'boolean', value: true },
      { key: 'auth.requireEmailVerify', label: 'Bắt buộc xác thực email', type: 'boolean', value: false },
      { key: 'auth.requireAgeVerify', label: 'Bắt buộc xác minh tuổi', type: 'boolean', value: false },
      { key: 'auth.minUsernameLength', label: 'Độ dài username tối thiểu', type: 'number', value: 3, validation: { min: 2, max: 20 } },

      { key: 'auth.googleEnabled', label: 'Bật đăng nhập Google', type: 'boolean', value: false },
      { key: 'auth.googleClientId', label: 'Google Client ID', description: 'Lấy ở Google Cloud Console → OAuth 2.0', type: 'string', value: '', isSecret: true },
      { key: 'auth.googleClientSecret', label: 'Google Client Secret', type: 'string', value: '', isSecret: true },

      { key: 'auth.discordEnabled', label: 'Bật đăng nhập Discord', type: 'boolean', value: false },
      { key: 'auth.discordClientId', label: 'Discord Client ID', description: 'Discord Developer Portal → OAuth2', type: 'string', value: '', isSecret: true },
      { key: 'auth.discordClientSecret', label: 'Discord Client Secret', type: 'string', value: '', isSecret: true },

      { key: 'auth.zaloEnabled', label: 'Bật đăng nhập Zalo', type: 'boolean', value: false },
      { key: 'auth.zaloAppId', label: 'Zalo App ID', description: 'Zalo Developers → Ứng dụng', type: 'string', value: '', isSecret: true },
      { key: 'auth.zaloAppSecret', label: 'Zalo App Secret', type: 'string', value: '', isSecret: true },

      { key: 'auth.oauthRedirectUri', label: 'OAuth Redirect URI', description: 'URL callback dùng chung cho các nhà cung cấp (vd: https://yoursite.com/oauth/callback)', type: 'string', value: '' },
    ],
  },
  {
    key: 'moderation',
    name: 'Kiểm duyệt',
    description: 'Cấu hình kiểm duyệt nội dung',
    icon: 'shield',
    sortOrder: 9,
    settings: [
      { key: 'mod.autoFlagKeywords', label: 'Từ khóa tự động flag (phẩy)', type: 'textarea', value: '' },
      { key: 'mod.maxWarningsBeforeBan', label: 'Số cảnh cáo trước khi ban', type: 'number', value: 3, validation: { min: 1 } },
      { key: 'mod.spamThreshold', label: 'Ngưỡng spam (bài/phút)', type: 'number', value: 5, validation: { min: 1 } },
      { key: 'mod.newUserRestrictDays', label: 'Hạn chế user mới (ngày)', type: 'number', value: 0, validation: { min: 0 } },
    ],
  },
  {
    key: 'gif',
    name: 'GIF (Chat)',
    description: 'Cấu hình nguồn tìm GIF cho khung chat. Lấy API key miễn phí ở Giphy Developers hoặc Tenor (Google Cloud).',
    icon: 'image',
    sortOrder: 9,
    settings: [
      { key: 'gif.provider', label: 'Nhà cung cấp', type: 'select', value: 'giphy',
        options: [{ value: 'giphy', label: 'Giphy' }, { value: 'tenor', label: 'Tenor' }] },
      { key: 'gif.apiKey', label: 'API Key', description: 'Khoá API của nhà cung cấp đã chọn', type: 'string', value: '', isSecret: true },
    ],
  },
];