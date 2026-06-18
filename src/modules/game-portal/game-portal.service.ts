import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GemTxType } from '@prisma/client';
import { GemService } from '../gem/gem.service';
import {
  GameConnector, GamePortalGame, GamePortalGameDetail, GameCharacter,
  ShopItemKind, VerifyCharacterInput,
} from './game-portal.contract';
import { MockConnector } from './connectors/mock.connector';

/**
 * Catalog game + registry connector.
 *
 * Hiện dùng MockConnector cho mọi game (stub) để frontend chạy được. Khi đấu
 * API thật: thêm connector của game vào `connectors` map theo slug.
 */
@Injectable()
export class GamePortalService {
  constructor(private readonly gem: GemService) {}

  // Catalog tĩnh (stub). Thực tế sẽ lấy từ DB / admin từng game đẩy lên.
  private readonly catalog: GamePortalGame[] = [
    { slug: 'nhat-kiem-mon', name: 'Nhất Kiếm Môn', publisher: 'SohaGame', genre: 'Nhập vai', iconUrl: '', rating: 4, featured: true, online: true, shortDesc: 'Tinh Hoa Thế Giới Kiếm Hiệp Nhập Vai', links: { googlePlay: '#', appStore: '#', apk: '#' } },
    { slug: '3q-sieu-hung', name: '3Q Siêu Hùng', publisher: 'SohaGame', genre: 'Thẻ tướng', iconUrl: '', rating: 4, featured: true, online: true, shortDesc: '3Q Siêu Hùng – Game AFK – X3 Sức Mạnh' },
    { slug: 'sieu-chien-binh', name: 'Siêu Chiến Binh', publisher: 'GGames', genre: 'Casual', iconUrl: '', rating: 4, featured: true, online: true, shortDesc: 'Game đối kháng casual' },
    { slug: 'tay-du-phuc-ma', name: 'Tây Du Phục Ma', publisher: 'GGames', genre: 'Nhập vai', iconUrl: '', online: true, shortDesc: 'Tu tiên phục ma' },
  ];

  private readonly connectors = new Map<string, GameConnector>();

  private connector(slug: string): GameConnector {
    if (!this.connectors.has(slug)) {
      if (!this.catalog.some((g) => g.slug === slug)) throw new NotFoundException('Game không tồn tại');
      // Mặc định stub. Thay bằng connector thật khi đấu API game.
      this.connectors.set(slug, new MockConnector(slug));
    }
    return this.connectors.get(slug)!;
  }

  listGames() {
    return this.catalog;
  }

  getGame(slug: string): GamePortalGameDetail {
    const g = this.catalog.find((x) => x.slug === slug);
    if (!g) throw new NotFoundException('Game không tồn tại');
    return {
      ...g,
      description: g.shortDesc || g.name,
      screenshots: [],
      events: [
        { id: 'e1', title: 'Sự kiện đăng nhập nhận quà', excerpt: 'Đăng nhập mỗi ngày nhận thưởng lớn.' },
      ],
    };
  }

  getServers(slug: string) {
    return this.connector(slug).getServers();
  }

  identifierKind(slug: string) {
    return { kind: this.connector(slug).identifierKind };
  }

  verifyCharacter(slug: string, input: VerifyCharacterInput) {
    if (!input?.serverId || !input?.identifier?.trim()) {
      throw new BadRequestException('Vui lòng chọn server và nhập định danh nhân vật');
    }
    return this.connector(slug).verifyCharacter(input).then((c) => {
      if (!c) throw new NotFoundException('Không tìm thấy nhân vật trên server đã chọn');
      return c;
    });
  }

  listGiftcodes(slug: string) {
    return this.connector(slug).listGiftcodes();
  }

  async redeemGiftcode(slug: string, code: string, input: VerifyCharacterInput) {
    if (!code?.trim()) throw new BadRequestException('Vui lòng nhập mã');
    const character = await this.verifyCharacter(slug, input);
    return this.connector(slug).redeemGiftcode(code.trim(), character);
  }

  listShop(slug: string, kind: ShopItemKind) {
    return this.connector(slug).listShop(kind);
  }

  /**
   * Mua vật phẩm: trừ Gem hệ thống rồi nhờ connector giao vào game.
   * Nếu giao thất bại sẽ hoàn lại Gem.
   */
  async buyItem(userId: string, slug: string, body: { itemId: string; kind: ShopItemKind; quantity?: number; serverId: string; identifier: string }) {
    const qty = Math.max(1, Math.min(99, body.quantity || 1));
    const character = await this.verifyCharacter(slug, { serverId: body.serverId, identifier: body.identifier });
    const items = await this.connector(slug).listShop(body.kind);
    const item = items.find((i) => i.id === body.itemId);
    if (!item) throw new NotFoundException('Vật phẩm không tồn tại');

    const cost = item.priceGem * qty;
    const balance = await this.gem.getBalance(userId);
    if (balance < cost) throw new BadRequestException(`Không đủ Gem. Cần ${cost}, hiện có ${balance}.`);

    const refId = `gp:${slug}:${item.id}:${Date.now()}`;
    await this.gem.debit(userId, cost, GemTxType.SPEND_PRODUCT, refId, `Mua ${qty}x ${item.name} (${slug})`);
    try {
      const res = await this.connector(slug).deliverPurchase(item, character, qty);
      if (!res.ok) throw new Error(res.message);
      return { ok: true, message: res.message, spentGem: cost };
    } catch (e: any) {
      // Hoàn Gem nếu giao vào game thất bại.
      await this.gem.credit(userId, cost, GemTxType.REFUND, refId, `Hoàn Gem: giao vật phẩm thất bại (${slug})`);
      throw new BadRequestException(e?.message || 'Giao vật phẩm vào game thất bại, đã hoàn Gem.');
    }
  }
}
