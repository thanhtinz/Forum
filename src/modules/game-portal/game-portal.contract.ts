/**
 * Hợp đồng (contract) chung cho cổng game.
 *
 * Mỗi game chạy trên VPS riêng và có API khác nhau, nên phần "đấu API" được
 * trừu tượng hoá thành một GameConnector. Frontend luôn gọi cùng một bộ
 * endpoint của web; web chọn đúng connector theo slug game để dịch sang API
 * thật của từng game. File này chỉ định nghĩa kiểu dữ liệu + interface; phần
 * cài đặt thật cho từng game sẽ được thêm sau (xem MockConnector cho ví dụ).
 */

export interface GamePortalGame {
  slug: string;
  name: string;
  publisher: string; // VD: SohaGame, GGames
  genre: string; // Nhập vai, Thẻ tướng, Casual...
  iconUrl: string;
  coverUrl?: string;
  shortDesc?: string;
  rating?: number; // 0..5
  featured?: boolean; // "Có thể bạn quan tâm"
  online?: boolean; // "Trò chơi trực tuyến"
  links?: { googlePlay?: string; appStore?: string; apk?: string };
}

export interface GamePortalGameDetail extends GamePortalGame {
  description: string; // HTML/markdown giới thiệu
  screenshots: string[];
  events: { id: string; title: string; date?: string; excerpt?: string }[];
}

export interface GameServer {
  id: string;
  name: string; // VD: "S1 - Tân Thủ"
}

/** Cách xác minh nhân vật khác nhau theo từng game. */
export type CharacterIdentifierKind = 'character_name' | 'character_id' | 'ingame_account';

export interface VerifyCharacterInput {
  serverId: string;
  identifier: string; // tên NV / id NV / tài khoản ingame
}

export interface GameCharacter {
  id: string;
  name: string;
  level: number;
  serverId: string;
  serverName?: string;
  avatarUrl?: string;
}

export interface RewardEntry {
  label: string; // "500m Bạc", "Cánh VIP"
  qty?: number;
  iconUrl?: string;
}

export interface GiftcodePublic {
  code: string;
  title?: string;
  rewards: RewardEntry[];
  totalItems?: number;
}

export interface RedeemResult {
  ok: boolean;
  message: string;
  rewards: RewardEntry[];
}

export type ShopItemKind = 'item' | 'bundle';

export interface ShopItem {
  id: string;
  name: string;
  kind: ShopItemKind;
  iconUrl?: string;
  description?: string;
  priceGem: number; // luôn quy về Gem của hệ thống
  category?: string;
  contents?: RewardEntry[]; // với bundle: liệt kê vật phẩm bên trong
}

/**
 * Interface mà mỗi game phải cài đặt để đấu nối API thật của mình.
 * Tất cả đều nhận slug ngầm định (connector được đăng ký theo slug).
 */
export interface GameConnector {
  readonly slug: string;
  /** Kiểu định danh nhân vật mà game này yêu cầu. */
  readonly identifierKind: CharacterIdentifierKind;

  getServers(): Promise<GameServer[]>;
  /** Trả về null nếu không tìm thấy nhân vật. */
  verifyCharacter(input: VerifyCharacterInput): Promise<GameCharacter | null>;
  listGiftcodes(): Promise<GiftcodePublic[]>;
  /** Gọi sang API game để phát quà code vào nhân vật. */
  redeemGiftcode(code: string, character: GameCharacter): Promise<RedeemResult>;
  listShop(kind: ShopItemKind): Promise<ShopItem[]>;
  /** Gọi sang API game để giao vật phẩm đã mua vào nhân vật. */
  deliverPurchase(item: ShopItem, character: GameCharacter, quantity: number): Promise<{ ok: boolean; message: string }>;
}
