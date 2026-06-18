'use client';

import { api } from './api';

// ── Kiểu dữ liệu (khớp với backend game-portal.contract.ts) ──
export interface GameItem {
  slug: string;
  name: string;
  publisher: string;
  genre: string;
  iconUrl: string;
  coverUrl?: string;
  shortDesc?: string;
  rating?: number;
  featured?: boolean;
  online?: boolean;
  links?: { googlePlay?: string; appStore?: string; apk?: string };
}

export interface GameDetail extends GameItem {
  description: string;
  screenshots: string[];
  events: { id: string; title: string; date?: string; excerpt?: string }[];
}

export interface GameServer { id: string; name: string }
export type IdentifierKind = 'character_name' | 'character_id' | 'ingame_account';
export interface GameCharacter {
  id: string; name: string; level: number;
  serverId: string; serverName?: string; avatarUrl?: string;
}
export interface RewardEntry { label: string; qty?: number; iconUrl?: string }
export interface GiftcodePublic { code: string; title?: string; rewards: RewardEntry[]; totalItems?: number }
export interface RedeemResult { ok: boolean; message: string; rewards: RewardEntry[] }
export type ShopItemKind = 'item' | 'bundle';
export interface ShopItem {
  id: string; name: string; kind: ShopItemKind; iconUrl?: string;
  description?: string; priceGem: number; category?: string; contents?: RewardEntry[];
}

// Nhãn cho từng kiểu định danh nhân vật.
export const IDENTIFIER_LABEL: Record<IdentifierKind, string> = {
  character_name: 'Tên nhân vật',
  character_id: 'ID nhân vật',
  ingame_account: 'Tài khoản trong game',
};

// ── API ──
const base = '/game-portal';
export const gamePortal = {
  listGames: () => api.get<GameItem[]>(`${base}/games`),
  getGame: (slug: string) => api.get<GameDetail>(`${base}/games/${slug}`),
  getServers: (slug: string) => api.get<GameServer[]>(`${base}/games/${slug}/servers`),
  getIdentifierKind: (slug: string) => api.get<{ kind: IdentifierKind }>(`${base}/games/${slug}/identifier-kind`),
  verify: (slug: string, serverId: string, identifier: string) =>
    api.post<GameCharacter>(`${base}/games/${slug}/verify`, { serverId, identifier }),
  listGiftcodes: (slug: string) => api.get<GiftcodePublic[]>(`${base}/games/${slug}/giftcodes`),
  redeem: (slug: string, code: string, serverId: string, identifier: string) =>
    api.post<RedeemResult>(`${base}/games/${slug}/giftcode/redeem`, { code, serverId, identifier }),
  listShop: (slug: string, kind: ShopItemKind) => api.get<ShopItem[]>(`${base}/games/${slug}/shop?kind=${kind}`),
  buy: (slug: string, body: { itemId: string; kind: ShopItemKind; quantity: number; serverId: string; identifier: string }) =>
    api.post<{ ok: boolean; message: string; spentGem: number }>(`${base}/games/${slug}/shop/buy`, body),
};
