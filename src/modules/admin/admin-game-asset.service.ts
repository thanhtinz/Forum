import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentService } from '../media/attachment.service';
import { MinigameType } from '@prisma/client';

@Injectable()
export class AdminGameAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachment: AttachmentService,
  ) {}

  // ════════════════════════════════════════════
  // MINIGAME CONFIG — cấu hình + asset
  // ════════════════════════════════════════════
  async listMinigames() {
    return this.prisma.minigameConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertMinigame(type: MinigameType, data: {
    name: string; description?: string; iconUrl?: string;
    minBet?: number; maxBet?: number; houseFee?: number;
    maxPlayers?: number; minPlayers?: number;
    assetConfig?: any; isActive?: boolean;
  }) {
    return this.prisma.minigameConfig.upsert({
      where: { type },
      update: data,
      create: { type, ...data, name: data.name },
    });
  }

  // Cập nhật asset cho 1 game (sprites cho bài, xúc xắc, con thú...)
  async updateMinigameAssets(type: MinigameType, assetConfig: any) {
    const game = await this.prisma.minigameConfig.findUnique({ where: { type } });
    if (!game) throw new NotFoundException('Game không tồn tại');
    return this.prisma.minigameConfig.update({
      where: { type },
      data: { assetConfig },
    });
  }

  // ════════════════════════════════════════════
  // STICKER PACK — upload zip, đặt tên
  // ════════════════════════════════════════════
  async listStickerPacks() {
    return this.prisma.stickerPack.findMany({
      include: { stickers: true, _count: { select: { stickers: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Tạo pack (sau khi đã giải nén zip và upload ảnh lên S3)
  async createStickerPack(data: {
    slug: string; name: string; description?: string;
    thumbnailUrl?: string; isPremium?: boolean;
    priceCoin?: number; priceGem?: number;
    stickers: { name: string; imageUrl: string }[];
  }) {
    if (!data.stickers?.length) throw new BadRequestException('Pack phải có ít nhất 1 sticker');

    return this.prisma.stickerPack.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl ?? data.stickers[0].imageUrl,
        isPremium: data.isPremium ?? false,
        priceCoin: data.priceCoin,
        priceGem: data.priceGem,
        stickers: {
          create: data.stickers.map((s, i) => ({
            name: s.name,
            imageUrl: s.imageUrl,
            sortOrder: i,
          })),
        },
      },
      include: { stickers: true },
    });
  }

  async importStickerPackFromUrls(data: {
    slug: string; name: string; description?: string;
    isPremium?: boolean; urls: string[];
  }) {
    const existing = await this.prisma.stickerPack.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException(`Pack "${data.slug}" đã tồn tại (id: ${existing.id})`);
    if (!data.urls?.length) throw new BadRequestException('Cần ít nhất 1 URL');

    const uploaded: { name: string; imageUrl: string }[] = [];
    const failed: string[] = [];

    for (let i = 0; i < data.urls.length; i++) {
      const url = data.urls[i];
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Referer': new URL(url).origin + '/',
            'Accept': 'image/webp,image/avif,image/apng,image/*,*/*;q=0.8',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const rawExt = url.split('.').pop()?.split('?')[0]?.toLowerCase() || 'webp';
        const ext = ['gif', 'webp', 'png', 'jpg', 'jpeg'].includes(rawExt) ? rawExt : 'webp';
        const filename = `${data.slug}-${i + 1}.${ext}`;
        const mimetype = ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
        const result = await this.attachment.upload(buffer, filename, mimetype, 'stickers');
        uploaded.push({ name: `${data.slug}-${i + 1}`, imageUrl: result.url });
      } catch {
        failed.push(url);
      }
    }

    if (!uploaded.length) throw new BadRequestException('Không tải được ảnh nào từ các URL đã cung cấp');

    const pack = await this.prisma.stickerPack.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        thumbnailUrl: uploaded[0].imageUrl,
        isPremium: data.isPremium ?? false,
        isActive: true,
        sortOrder: 0,
        stickers: {
          create: uploaded.map((s, i) => ({ name: s.name, imageUrl: s.imageUrl, sortOrder: i })),
        },
      },
      include: { _count: { select: { stickers: true } } },
    });

    return { pack, uploaded: uploaded.length, failed: failed.length, failedUrls: failed };
  }

  async importFromWpDiscuzSearch(searchUrls: string[]) {
    const FETCH_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Referer': 'https://hoathinh3d.co/',
      'Accept': 'application/json, */*;q=0.8',
    };

    const results: any[] = [];

    for (const searchUrl of searchUrls) {
      let json: any;
      try {
        const res = await fetch(searchUrl, { headers: FETCH_HEADERS });
        if (!res.ok) { results.push({ url: searchUrl, error: `HTTP ${res.status}` }); continue; }
        json = await res.json();
      } catch (e: any) {
        results.push({ url: searchUrl, error: `Fetch failed: ${e?.message}` });
        continue;
      }

      const packs = this.parseWpDiscuzJson(json);
      if (!packs.length) { results.push({ url: searchUrl, error: 'No packs parsed from response' }); continue; }

      for (const pack of packs) {
        const existing = await this.prisma.stickerPack.findUnique({ where: { slug: pack.slug } });
        if (existing) { results.push({ url: searchUrl, slug: pack.slug, status: 'skipped', reason: 'already exists' }); continue; }
        try {
          const r = await this.importStickerPackFromUrls(pack);
          results.push({ url: searchUrl, slug: pack.slug, status: 'ok', uploaded: r.uploaded, failed: r.failed });
        } catch (e: any) {
          results.push({ url: searchUrl, slug: pack.slug, status: 'error', error: e?.message });
        }
      }
    }

    return results;
  }

  private parseWpDiscuzJson(json: any): { slug: string; name: string; description?: string; urls: string[] }[] {
    const items: any[] = Array.isArray(json)
      ? json
      : json?.data?.packs ?? json?.packs ?? json?.results ?? json?.data ?? [];

    if (!Array.isArray(items) || !items.length) return [];

    return items.flatMap((item: any) => {
      const name: string = item.post_title ?? item.name ?? item.title ?? '';
      const rawSlug: string = item.post_name ?? item.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!name || !rawSlug) return [];

      // Collect all sticker image URLs from various known field shapes
      const stickerList: any[] = item.stickers ?? item.images ?? item.meta?.stickers ?? item.items ?? [];
      const urls: string[] = stickerList
        .map((s: any) => (typeof s === 'string' ? s : s.url ?? s.image ?? s.src ?? s.file ?? ''))
        .filter((u: string) => u && /^https?:\/\/.+\.(webp|gif|png|jpe?g)(\?.*)?$/i.test(u));

      if (!urls.length) return [];
      return [{ slug: rawSlug, name, urls }];
    });
  }

  async updateStickerPack(id: string, data: any) {
    return this.prisma.stickerPack.update({ where: { id }, data });
  }

  async deleteStickerPack(id: string) {
    return this.prisma.stickerPack.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Thêm sticker vào pack đã có
  async addStickerToPack(packId: string, sticker: { name: string; imageUrl: string }) {
    const pack = await this.prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundException('Pack không tồn tại');
    const count = await this.prisma.sticker.count({ where: { packId } });
    return this.prisma.sticker.create({
      data: { packId, name: sticker.name, imageUrl: sticker.imageUrl, sortOrder: count },
    });
  }

  async removeSticker(stickerId: string) {
    return this.prisma.sticker.delete({ where: { id: stickerId } });
  }

  // ───────── Thư viện avatar (pack ảnh đại diện cho user chọn) ─────────
  async listAvatarPacks() {
    return this.prisma.avatarPack.findMany({
      include: { avatars: { orderBy: { sortOrder: 'asc' } }, _count: { select: { avatars: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createAvatarPack(data: {
    slug: string; name: string; description?: string; thumbnailUrl?: string;
    avatars: { name?: string; imageUrl: string }[];
  }) {
    if (!data.avatars?.length) throw new BadRequestException('Pack phải có ít nhất 1 avatar');
    return this.prisma.avatarPack.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl ?? data.avatars[0].imageUrl,
        avatars: {
          create: data.avatars.map((a, i) => ({ name: a.name || `Avatar ${i + 1}`, imageUrl: a.imageUrl, sortOrder: i })),
        },
      },
      include: { avatars: true },
    });
  }

  async updateAvatarPack(id: string, data: any) {
    return this.prisma.avatarPack.update({ where: { id }, data });
  }

  async deleteAvatarPack(id: string) {
    return this.prisma.avatarPack.delete({ where: { id } });
  }

  async addAvatarToPack(packId: string, avatar: { name?: string; imageUrl: string }) {
    const pack = await this.prisma.avatarPack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundException('Pack không tồn tại');
    const count = await this.prisma.avatarImage.count({ where: { packId } });
    return this.prisma.avatarImage.create({
      data: { packId, name: avatar.name || `Avatar ${count + 1}`, imageUrl: avatar.imageUrl, sortOrder: count },
    });
  }

  async removeAvatar(avatarId: string) {
    return this.prisma.avatarImage.delete({ where: { id: avatarId } });
  }

  // Công khai — danh sách avatar đang bật cho user chọn
  async avatarLibrary() {
    return this.prisma.avatarPack.findMany({
      where: { isActive: true },
      include: { avatars: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ───────── Khung avatar (sản phẩm) — quản trị ─────────
  listFrames() {
    return this.prisma.avatarFrameProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createFrame(data: {
    slug: string; name: string; description?: string; imageUrl: string;
    priceCoin?: number | null; coinDays?: number | null;
    priceGem?: number | null; gemDays?: number | null;
    isActive?: boolean; sortOrder?: number;
  }) {
    if (!data.slug || !data.name || !data.imageUrl) throw new BadRequestException('Thiếu slug, tên hoặc ảnh khung');
    if (data.priceCoin == null && data.priceGem == null) throw new BadRequestException('Phải có ít nhất 1 giá (Xu hoặc Gem)');
    return this.prisma.avatarFrameProduct.create({
      data: {
        slug: data.slug, name: data.name, description: data.description, imageUrl: data.imageUrl,
        priceCoin: data.priceCoin ?? null, coinDays: data.coinDays ?? null,
        priceGem: data.priceGem ?? null, gemDays: data.gemDays ?? null,
        isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  updateFrame(id: string, data: any) {
    return this.prisma.avatarFrameProduct.update({ where: { id }, data });
  }

  deleteFrame(id: string) {
    return this.prisma.avatarFrameProduct.delete({ where: { id } });
  }

  // ───────── Badge trang trí (sản phẩm) — quản trị ─────────
  listBadgeProducts() {
    return this.prisma.badgeProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createBadgeProduct(data: {
    slug: string; name: string; description?: string; imageUrl: string;
    priceCoin?: number | null; coinDays?: number | null;
    priceGem?: number | null; gemDays?: number | null;
    isActive?: boolean; sortOrder?: number;
  }) {
    if (!data.slug || !data.name || !data.imageUrl) throw new BadRequestException('Thiếu slug, tên hoặc ảnh badge');
    if (data.priceCoin == null && data.priceGem == null) throw new BadRequestException('Phải có ít nhất 1 giá (Xu hoặc Gem)');
    return this.prisma.badgeProduct.create({
      data: {
        slug: data.slug, name: data.name, description: data.description, imageUrl: data.imageUrl,
        priceCoin: data.priceCoin ?? null, coinDays: data.coinDays ?? null,
        priceGem: data.priceGem ?? null, gemDays: data.gemDays ?? null,
        isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  updateBadgeProduct(id: string, data: any) {
    return this.prisma.badgeProduct.update({ where: { id }, data });
  }

  deleteBadgeProduct(id: string) {
    return this.prisma.badgeProduct.delete({ where: { id } });
  }

  // ───────── Hiệu ứng tên (sản phẩm) — quản trị ─────────
  listNameEffects() {
    return this.prisma.nameEffectProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createNameEffect(data: {
    slug: string; name: string; description?: string; css: string;
    priceCoin?: number | null; coinDays?: number | null;
    priceGem?: number | null; gemDays?: number | null;
    isActive?: boolean; sortOrder?: number;
  }) {
    if (!data.slug || !data.name || !data.css) throw new BadRequestException('Thiếu slug, tên hoặc CSS hiệu ứng');
    if (data.priceCoin == null && data.priceGem == null) throw new BadRequestException('Phải có ít nhất 1 giá (Xu hoặc Gem)');
    return this.prisma.nameEffectProduct.create({
      data: {
        slug: data.slug, name: data.name, description: data.description, css: data.css,
        priceCoin: data.priceCoin ?? null, coinDays: data.coinDays ?? null,
        priceGem: data.priceGem ?? null, gemDays: data.gemDays ?? null,
        isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  updateNameEffect(id: string, data: any) {
    return this.prisma.nameEffectProduct.update({ where: { id }, data });
  }

  deleteNameEffect(id: string) {
    return this.prisma.nameEffectProduct.delete({ where: { id } });
  }

  // ───────── Bong bóng chat (sản phẩm) — quản trị ─────────
  listChatBubbles() {
    return this.prisma.chatBubbleProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createChatBubble(data: {
    slug: string; name: string; description?: string; imageUrl: string; textColor?: string | null;
    priceCoin?: number | null; coinDays?: number | null;
    priceGem?: number | null; gemDays?: number | null;
    isActive?: boolean; sortOrder?: number;
  }) {
    if (!data.slug || !data.name || !data.imageUrl) throw new BadRequestException('Thiếu slug, tên hoặc ảnh bong bóng');
    if (data.priceCoin == null && data.priceGem == null) throw new BadRequestException('Phải có ít nhất 1 giá (Xu hoặc Gem)');
    return this.prisma.chatBubbleProduct.create({
      data: {
        slug: data.slug, name: data.name, description: data.description, imageUrl: data.imageUrl, textColor: data.textColor || null,
        priceCoin: data.priceCoin ?? null, coinDays: data.coinDays ?? null,
        priceGem: data.priceGem ?? null, gemDays: data.gemDays ?? null,
        isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  updateChatBubble(id: string, data: any) {
    return this.prisma.chatBubbleProduct.update({ where: { id }, data });
  }

  deleteChatBubble(id: string) {
    return this.prisma.chatBubbleProduct.delete({ where: { id } });
  }
}
