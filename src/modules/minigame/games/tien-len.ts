// Engine Tiến Lên Miền Nam — đủ logic combo + bot, chơi 1 người vs 3 bot.
import { Card, CardGames } from './card-games';

export type ComboType = 'single' | 'pair' | 'triple' | 'straight' | 'four' | 'doubleSeq' | 'invalid';

export interface Combo {
  type: ComboType;
  size: number;
  rank: number; // hạng so sánh (rank cao nhất trong combo)
  cards: Card[];
}

export interface TLState {
  hands: Card[][];      // 4 tay bài (0 = người chơi)
  turn: number;         // tới lượt ai
  pile: Card[];         // bộ bài đang trên bàn
  pileCombo: Combo | null;
  leader: number;       // người được quyền đánh tự do
  passed: boolean[];    // ai đã bỏ lượt trong vòng hiện tại
  finished: boolean;
  winner: number;       // -1 nếu chưa
  log: string[];
}

// 3 < 4 < ... < 2 ; chất ♠ < ♣ < ♦ < ♥
const RANK_ORDER = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUIT_ORDER: Card['suit'][] = ['spades', 'clubs', 'diamonds', 'hearts'];

export class TienLen {
  static rankVal(c: Card): number {
    return RANK_ORDER.indexOf(c.rank);
  }
  static suitVal(c: Card): number {
    return SUIT_ORDER.indexOf(c.suit);
  }
  // điểm so sánh 1 lá: rank*4 + suit
  static score(c: Card): number {
    return this.rankVal(c) * 4 + this.suitVal(c);
  }

  static sortHand(hand: Card[]): Card[] {
    return [...hand].sort((a, b) => this.score(a) - this.score(b));
  }

  // Phân tích 1 bộ bài thành combo
  static parse(cards: Card[]): Combo {
    const cs = this.sortHand(cards);
    const n = cs.length;
    const invalid: Combo = { type: 'invalid', size: 0, rank: -1, cards: cs };
    if (n === 0) return invalid;

    const ranks = cs.map((c) => this.rankVal(c));
    const allSameRank = ranks.every((r) => r === ranks[0]);

    if (n === 1) return { type: 'single', size: 1, rank: this.score(cs[0]), cards: cs };
    if (n === 2 && allSameRank) return { type: 'pair', size: 2, rank: this.score(cs[1]), cards: cs };
    if (n === 3 && allSameRank) return { type: 'triple', size: 3, rank: this.score(cs[2]), cards: cs };
    if (n === 4 && allSameRank) return { type: 'four', size: 4, rank: this.score(cs[3]), cards: cs };

    // Sảnh: ≥3 lá liên tiếp, không chứa 2
    const isStraight =
      n >= 3 &&
      !cs.some((c) => c.rank === '2') &&
      ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
    if (isStraight) return { type: 'straight', size: n, rank: this.score(cs[n - 1]), cards: cs };

    // Đôi thông: ≥3 đôi liên tiếp (6,8,10... lá)
    if (n >= 6 && n % 2 === 0 && !cs.some((c) => c.rank === '2')) {
      let ok = true;
      const pairRanks: number[] = [];
      for (let i = 0; i < n; i += 2) {
        if (ranks[i] !== ranks[i + 1]) { ok = false; break; }
        pairRanks.push(ranks[i]);
      }
      if (ok && pairRanks.every((r, i) => i === 0 || r === pairRanks[i - 1] + 1)) {
        return { type: 'doubleSeq', size: n, rank: this.score(cs[n - 1]), cards: cs };
      }
    }
    return invalid;
  }

  // cur có chặt được prev không
  static canBeat(prev: Combo | null, cur: Combo): boolean {
    if (cur.type === 'invalid') return false;
    if (!prev) return true; // đánh tự do

    // Hàng chặt (bom): tứ quý & đôi thông chặt được heo (2) và bom nhỏ hơn
    const curBomb = cur.type === 'four' || cur.type === 'doubleSeq';
    const prevIsTwoSingle = prev.type === 'single' && prev.cards[0].rank === '2';
    const prevIsTwoPair = prev.type === 'pair' && prev.cards[0].rank === '2';
    if (curBomb && (prevIsTwoSingle || prevIsTwoPair)) return true;
    if (curBomb && (prev.type === 'four' || prev.type === 'doubleSeq')) {
      // bom lớn hơn theo size rồi rank
      if (cur.size !== prev.size) return cur.size > prev.size;
      return cur.rank > prev.rank;
    }

    if (cur.type !== prev.type || cur.size !== prev.size) return false;
    return cur.rank > prev.rank;
  }

  // ── Khởi tạo ván vs 3 bot ──
  static start(): TLState {
    const hands = CardGames.tienLenDeal(4);
    // người cầm 3 bích đi trước
    let leader = 0;
    for (let p = 0; p < 4; p++) {
      if (hands[p].some((c) => c.rank === '3' && c.suit === 'spades')) { leader = p; break; }
    }
    return {
      hands: hands.map((h) => this.sortHand(h)),
      turn: leader,
      pile: [],
      pileCombo: null,
      leader,
      passed: [false, false, false, false],
      finished: false,
      winner: -1,
      log: [],
    };
  }

  // ── Bot chọn nước: combo nhỏ nhất chặt được, ưu tiên không xé bom ──
  static botMove(hand: Card[], pile: Combo | null): Card[] | null {
    const sorted = this.sortHand(hand);
    const candidates: Combo[] = [];

    if (!pile) {
      // đánh tự do: ưu tiên lá đơn nhỏ nhất
      return [sorted[0]];
    }

    // sinh các combo cùng loại
    if (pile.type === 'single') {
      for (const c of sorted) candidates.push(this.parse([c]));
    } else if (pile.type === 'pair' || pile.type === 'triple' || pile.type === 'four') {
      const byRank = this.groupByRank(sorted);
      for (const grp of byRank) {
        if (grp.length >= pile.size) candidates.push(this.parse(grp.slice(0, pile.size)));
      }
    } else if (pile.type === 'straight') {
      candidates.push(...this.findStraights(sorted, pile.size));
    } else if (pile.type === 'doubleSeq') {
      // hiếm — bỏ qua cho bot
    }

    const valid = candidates.filter((c) => this.canBeat(pile, c)).sort((a, b) => a.rank - b.rank);
    if (valid.length) return valid[0].cards;

    // thử bom chặt heo
    if (pile.type === 'single' && pile.cards[0].rank === '2') {
      const four = this.groupByRank(sorted).find((g) => g.length === 4);
      if (four) return four;
    }
    return null; // bỏ lượt
  }

  private static groupByRank(cards: Card[]): Card[][] {
    const map = new Map<string, Card[]>();
    for (const c of cards) {
      if (!map.has(c.rank)) map.set(c.rank, []);
      map.get(c.rank)!.push(c);
    }
    return [...map.values()];
  }

  private static findStraights(cards: Card[], size: number): Combo[] {
    const res: Combo[] = [];
    const uniq: Card[] = [];
    const seen = new Set<number>();
    for (const c of cards) {
      const r = this.rankVal(c);
      if (c.rank === '2') continue;
      if (!seen.has(r)) { seen.add(r); uniq.push(c); }
    }
    uniq.sort((a, b) => this.rankVal(a) - this.rankVal(b));
    for (let i = 0; i + size <= uniq.length; i++) {
      const slice = uniq.slice(i, i + size);
      const combo = this.parse(slice);
      if (combo.type === 'straight') res.push(combo);
    }
    return res;
  }

  // xóa các lá đã đánh khỏi tay
  static removeCards(hand: Card[], cards: Card[]): Card[] {
    const keys = new Set(cards.map((c) => `${c.rank}-${c.suit}`));
    return hand.filter((c) => !keys.has(`${c.rank}-${c.suit}`));
  }
}
