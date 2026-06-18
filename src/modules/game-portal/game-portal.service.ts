import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GemTxType } from '@prisma/client';
import { GemService } from '../gem/gem.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GameConnector, GamePortalGame, GamePortalGameDetail,
  ShopItemKind, VerifyCharacterInput, CharacterIdentifierKind,
} from './game-portal.contract';
import { MockConnector } from './connectors/mock.connector';
import { RestConnector } from './connectors/rest.connector';

/**
 * Catalog game + registry connector.
 *
 * Hiện dùng MockConnector cho mọi game (stub) để frontend chạy được. Khi đấu
 * API thật: thêm connector của game vào `connectors` map theo slug.
 */
@Injectable()
export class GamePortalService {
  constructor(
    private readonly gem: GemService,
    private readonly prisma: PrismaService,
  ) {}

  private toGame(g: any): GamePortalGame {
    return {
      slug: g.slug, name: g.name, publisher: g.publisher, genre: g.genre,
      iconUrl: g.iconUrl, coverUrl: g.coverUrl || undefined, shortDesc: g.shortDesc || undefined,
      rating: g.rating, featured: g.featured, online: g.online,
    };
  }

  // Chọn connector: nếu game đã đấu API (GameApi active) -> RestConnector, ngược lại MockConnector stub.
  private async connector(slug: string): Promise<GameConnector> {
    const g = await this.prisma.portalGame.findUnique({ where: { slug } });
    if (!g) throw new NotFoundException('Game không tồn tại');
    const cfg = await this.prisma.gameApi.findUnique({ where: { slug } });
    if (cfg && cfg.active && cfg.baseUrl) {
      return new RestConnector({
        slug,
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        identifierKind: cfg.identifierKind as CharacterIdentifierKind,
      });
    }
    return new MockConnector(slug);
  }

  async listGames(): Promise<GamePortalGame[]> {
    const games = await this.prisma.portalGame.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return games.map((g) => this.toGame(g));
  }

  async getGame(slug: string): Promise<GamePortalGameDetail> {
    const g = await this.prisma.portalGame.findUnique({ where: { slug } });
    if (!g) throw new NotFoundException('Game không tồn tại');
    return {
      ...this.toGame(g),
      description: g.description || g.shortDesc || g.name,
      screenshots: [],
      events: [
        { id: 'e1', title: 'Sự kiện đăng nhập nhận quà', excerpt: 'Đăng nhập mỗi ngày nhận thưởng lớn.' },
      ],
    };
  }

  async getServers(slug: string) {
    return (await this.connector(slug)).getServers();
  }

  async identifierKind(slug: string) {
    return { kind: (await this.connector(slug)).identifierKind };
  }

  async verifyCharacter(slug: string, input: VerifyCharacterInput) {
    if (!input?.serverId || !input?.identifier?.trim()) {
      throw new BadRequestException('Vui lòng chọn server và nhập định danh nhân vật');
    }
    const c = await (await this.connector(slug)).verifyCharacter(input);
    if (!c) throw new NotFoundException('Không tìm thấy nhân vật trên server đã chọn');
    return c;
  }

  async listGiftcodes(slug: string) {
    return (await this.connector(slug)).listGiftcodes();
  }

  async redeemGiftcode(slug: string, code: string, input: VerifyCharacterInput) {
    if (!code?.trim()) throw new BadRequestException('Vui lòng nhập mã');
    const character = await this.verifyCharacter(slug, input);
    return (await this.connector(slug)).redeemGiftcode(code.trim(), character);
  }

  async listShop(slug: string, kind: ShopItemKind) {
    return (await this.connector(slug)).listShop(kind);
  }

  /**
   * Mua vật phẩm: trừ Gem hệ thống rồi nhờ connector giao vào game.
   * Nếu giao thất bại sẽ hoàn lại Gem.
   */
  async buyItem(userId: string, slug: string, body: { itemId: string; kind: ShopItemKind; quantity?: number; serverId: string; identifier: string }) {
    const qty = Math.max(1, Math.min(99, body.quantity || 1));
    const character = await this.verifyCharacter(slug, { serverId: body.serverId, identifier: body.identifier });
    const conn = await this.connector(slug);
    const items = await conn.listShop(body.kind);
    const item = items.find((i) => i.id === body.itemId);
    if (!item) throw new NotFoundException('Vật phẩm không tồn tại');

    const cost = item.priceGem * qty;
    const balance = await this.gem.getBalance(userId);
    if (balance < cost) throw new BadRequestException(`Không đủ Gem. Cần ${cost}, hiện có ${balance}.`);

    const refId = `gp:${slug}:${item.id}:${Date.now()}`;
    await this.gem.debit(userId, cost, GemTxType.SPEND_PRODUCT, refId, `Mua ${qty}x ${item.name} (${slug})`);
    try {
      const res = await conn.deliverPurchase(item, character, qty);
      if (!res.ok) throw new Error(res.message);
      return { ok: true, message: res.message, spentGem: cost };
    } catch (e: any) {
      // Hoàn Gem nếu giao vào game thất bại.
      await this.gem.credit(userId, cost, GemTxType.REFUND, refId, `Hoàn Gem: giao vật phẩm thất bại (${slug})`);
      throw new BadRequestException(e?.message || 'Giao vật phẩm vào game thất bại, đã hoàn Gem.');
    }
  }

  // ──────────────────────────────────────────────
  // ADMIN: quản lý đấu API game ngoài
  // ──────────────────────────────────────────────
  async listApis() {
    const [apis, games] = await Promise.all([
      this.prisma.gameApi.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.portalGame.findMany({ orderBy: { createdAt: 'asc' }, select: { slug: true, name: true } }),
    ]);
    return { apis, catalog: games };
  }

  // ── Admin: tạo/sửa/xoá game trong cổng ──
  async adminListGames() {
    return this.prisma.portalGame.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async upsertGame(body: any) {
    const slug = (body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug || !body.name?.trim()) throw new BadRequestException('Thiếu slug hoặc tên game');
    const data = {
      name: body.name.trim(),
      publisher: body.publisher?.trim() || '',
      genre: body.genre?.trim() || '',
      iconUrl: body.iconUrl?.trim() || '',
      coverUrl: body.coverUrl?.trim() || null,
      shortDesc: body.shortDesc?.trim() || null,
      description: body.description?.trim() || null,
      rating: typeof body.rating === 'number' ? body.rating : 4,
      featured: !!body.featured,
      online: body.online ?? true,
      active: body.active ?? true,
      sortOrder: Number(body.sortOrder) || 0,
    };
    return this.prisma.portalGame.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }

  async deleteGame(slug: string) {
    await this.prisma.gameApi.deleteMany({ where: { slug } });
    await this.prisma.portalGame.delete({ where: { slug } }).catch(() => { throw new NotFoundException('Không tìm thấy game'); });
    return { ok: true };
  }

  async upsertApi(body: { id?: string; slug: string; name: string; baseUrl: string; apiKey?: string; identifierKind?: string; active?: boolean }) {
    if (!body.slug?.trim() || !body.baseUrl?.trim()) throw new BadRequestException('Thiếu slug hoặc baseUrl');
    const game = await this.prisma.portalGame.findUnique({ where: { slug: body.slug } });
    if (!game) throw new BadRequestException('Slug game không có trong cổng');
    const data = {
      name: body.name?.trim() || body.slug,
      baseUrl: body.baseUrl.trim(),
      apiKey: body.apiKey?.trim() || null,
      identifierKind: body.identifierKind || 'character_name',
      active: body.active ?? true,
    };
    return this.prisma.gameApi.upsert({
      where: { slug: body.slug },
      update: data,
      create: { slug: body.slug, ...data },
    });
  }

  async deleteApi(id: string) {
    await this.prisma.gameApi.delete({ where: { id } }).catch(() => { throw new NotFoundException('Không tìm thấy cấu hình'); });
    return { ok: true };
  }

  // Test đấu nối: gọi thử GET {base}/servers
  async testApi(id: string) {
    const cfg = await this.prisma.gameApi.findUnique({ where: { id } });
    if (!cfg) throw new NotFoundException('Không tìm thấy cấu hình');
    let ok = false; let message = '';
    try {
      const conn = new RestConnector({ slug: cfg.slug, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, identifierKind: cfg.identifierKind as CharacterIdentifierKind });
      const servers = await conn.getServers();
      ok = Array.isArray(servers);
      message = ok ? `OK — ${servers.length} server` : 'Phản hồi không hợp lệ';
    } catch (e: any) {
      message = e?.message || 'Kết nối thất bại';
    }
    await this.prisma.gameApi.update({ where: { id }, data: { lastTestAt: new Date(), lastTestOk: ok } });
    return { ok, message };
  }
}
