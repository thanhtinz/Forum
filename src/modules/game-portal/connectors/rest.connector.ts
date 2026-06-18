import {
  CharacterIdentifierKind,
  GameConnector,
  GameServer,
  GiftcodePublic,
  RedeemResult,
  ShopItem,
  ShopItemKind,
  VerifyCharacterInput,
  GameCharacter,
} from '../game-portal.contract';

export interface RestConnectorConfig {
  slug: string;
  baseUrl: string;
  apiKey?: string | null;
  identifierKind: CharacterIdentifierKind;
}

/**
 * Connector gọi REST API thật của game ngoài.
 * Quy ước endpoint phía game (có thể chỉnh theo từng game nếu cần):
 *   GET  {base}/servers
 *   POST {base}/verify           { serverId, identifier }
 *   GET  {base}/giftcodes
 *   POST {base}/redeem           { code, characterId, serverId }
 *   GET  {base}/shop?kind=item
 *   POST {base}/deliver          { itemId, characterId, serverId, quantity }
 */
export class RestConnector implements GameConnector {
  readonly slug: string;
  readonly identifierKind: CharacterIdentifierKind;
  private readonly base: string;
  private readonly apiKey?: string | null;

  constructor(cfg: RestConnectorConfig) {
    this.slug = cfg.slug;
    this.identifierKind = cfg.identifierKind;
    this.base = cfg.baseUrl.replace(/\/$/, '');
    this.apiKey = cfg.apiKey;
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`API game lỗi ${res.status}`);
    return (await res.json()) as T;
  }

  getServers(): Promise<GameServer[]> {
    return this.call<GameServer[]>('/servers');
  }

  async verifyCharacter(input: VerifyCharacterInput): Promise<GameCharacter | null> {
    try {
      return await this.call<GameCharacter>('/verify', { method: 'POST', body: JSON.stringify(input) });
    } catch {
      return null;
    }
  }

  listGiftcodes(): Promise<GiftcodePublic[]> {
    return this.call<GiftcodePublic[]>('/giftcodes');
  }

  redeemGiftcode(code: string, character: GameCharacter): Promise<RedeemResult> {
    return this.call<RedeemResult>('/redeem', {
      method: 'POST',
      body: JSON.stringify({ code, characterId: character.id, serverId: character.serverId }),
    });
  }

  listShop(kind: ShopItemKind): Promise<ShopItem[]> {
    return this.call<ShopItem[]>(`/shop?kind=${encodeURIComponent(kind)}`);
  }

  deliverPurchase(item: ShopItem, character: GameCharacter, quantity: number): Promise<{ ok: boolean; message: string }> {
    return this.call<{ ok: boolean; message: string }>('/deliver', {
      method: 'POST',
      body: JSON.stringify({ itemId: item.id, characterId: character.id, serverId: character.serverId, quantity }),
    });
  }
}
