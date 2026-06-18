import {
  GameConnector, GameServer, VerifyCharacterInput, GameCharacter,
  GiftcodePublic, RedeemResult, ShopItem, ShopItemKind, CharacterIdentifierKind,
} from '../game-portal.contract';

/**
 * Connector mẫu dùng dữ liệu giả lập, để frontend chạy/preview được ngay khi
 * chưa có API thật của game. Khi tích hợp game thật, tạo một connector mới cài
 * đặt GameConnector (gọi API VPS của game) rồi đăng ký trong GamePortalService.
 */
export class MockConnector implements GameConnector {
  constructor(
    public readonly slug: string,
    public readonly identifierKind: CharacterIdentifierKind = 'character_name',
  ) {}

  async getServers(): Promise<GameServer[]> {
    return [
      { id: 's1', name: 'S1 - Tân Thủ' },
      { id: 's2', name: 'S2 - Phong Vân' },
      { id: 's3', name: 'S3 - Hợp Nhất' },
    ];
  }

  async verifyCharacter(input: VerifyCharacterInput): Promise<GameCharacter | null> {
    const id = input.identifier?.trim();
    if (!id) return null;
    // Giả lập: bất kỳ định danh không rỗng nào cũng "tìm thấy" nhân vật.
    return {
      id: `${input.serverId}:${id}`,
      name: id,
      level: 1 + (id.length % 80),
      serverId: input.serverId,
      serverName: (await this.getServers()).find((s) => s.id === input.serverId)?.name,
    };
  }

  async listGiftcodes(): Promise<GiftcodePublic[]> {
    return [
      { code: 'HUYETKIEM', totalItems: 5, rewards: [{ label: '500m Bạc' }, { label: 'Túi quà', qty: 10 }, { label: '+3' }] },
      { code: 'CANHVIP', totalItems: 5, rewards: [{ label: 'Cánh Lam', qty: 200 }, { label: 'Cánh Hỏa', qty: 200 }, { label: '+3' }] },
      { code: 'TANTHU2026', totalItems: 4, rewards: [{ label: 'Vàng', qty: 100 }, { label: 'EXP x2', qty: 3 }] },
    ];
  }

  async redeemGiftcode(code: string, character: GameCharacter): Promise<RedeemResult> {
    const found = (await this.listGiftcodes()).find((g) => g.code.toUpperCase() === code.toUpperCase());
    if (!found) return { ok: false, message: 'Mã không tồn tại hoặc đã hết hạn.', rewards: [] };
    return { ok: true, message: `Đã gửi quà của mã ${found.code} cho nhân vật ${character.name}.`, rewards: found.rewards };
  }

  async listShop(kind: ShopItemKind): Promise<ShopItem[]> {
    if (kind === 'bundle') {
      return [
        { id: 'b1', name: 'Gói Tân Thủ', kind: 'bundle', priceGem: 50, category: 'Gói nạp', contents: [{ label: 'Vàng', qty: 1000 }, { label: 'EXP đan', qty: 10 }] },
        { id: 'b2', name: 'Gói VIP Tuần', kind: 'bundle', priceGem: 200, category: 'Gói nạp', contents: [{ label: 'Vé VIP', qty: 7 }, { label: 'Cánh', qty: 1 }] },
      ];
    }
    return [
      { id: 'i1', name: 'x1k Kinh nghiệm đan', kind: 'item', priceGem: 20, category: 'Vật Phẩm' },
      { id: 'i2', name: 'Nguyên lực linh đan', kind: 'item', priceGem: 10, category: 'Vật Phẩm' },
      { id: 'i3', name: 'Rương trang bị', kind: 'item', priceGem: 35, category: 'Vật Phẩm' },
    ];
  }

  async deliverPurchase(item: ShopItem, character: GameCharacter, quantity: number) {
    return { ok: true, message: `Đã gửi ${quantity}x ${item.name} vào nhân vật ${character.name}.` };
  }
}
