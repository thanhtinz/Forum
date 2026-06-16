// Engine cho các game bài

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string; // 2-10, J, Q, K, A
  value: number;
}

export class CardGames {
  static SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  // Tạo bộ bài 52 lá đã xáo
  static createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of CardGames.SUITS) {
      for (let i = 0; i < CardGames.RANKS.length; i++) {
        const rank = CardGames.RANKS[i];
        let value = i + 2;
        if (rank === 'J' || rank === 'Q' || rank === 'K') value = 10;
        if (rank === 'A') value = 11;
        deck.push({ suit, rank, value });
      }
    }
    return CardGames.shuffle(deck);
  }

  static shuffle(deck: Card[]): Card[] {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  // ── BLACKJACK ──
  static handValue(cards: Card[]): number {
    let value = cards.reduce((s, c) => s + c.value, 0);
    let aces = cards.filter((c) => c.rank === 'A').length;
    while (value > 21 && aces > 0) {
      value -= 10; // A từ 11 → 1
      aces--;
    }
    return value;
  }

  static blackjackStart() {
    const deck = CardGames.createDeck();
    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, deck.pop()!];
    return {
      deck,
      playerHand,
      dealerHand: [dealerHand[0]], // chỉ hiện 1 lá nhà cái
      dealerHidden: dealerHand[1],
      playerValue: CardGames.handValue(playerHand),
      finished: false,
    };
  }

  static blackjackAction(state: any, action: 'hit' | 'stand'): any {
    const deck: Card[] = state.deck;
    const playerHand: Card[] = state.playerHand;
    const dealerHand: Card[] = [...state.dealerHand, state.dealerHidden];

    if (action === 'hit') {
      playerHand.push(deck.pop()!);
      const playerValue = CardGames.handValue(playerHand);
      if (playerValue > 21) {
        return { ...state, playerHand, playerValue, finished: true, playerWon: false, bust: true };
      }
      return { ...state, deck, playerHand, playerValue, finished: false };
    }

    // STAND — nhà cái rút đến >= 17
    while (CardGames.handValue(dealerHand) < 17) {
      dealerHand.push(deck.pop()!);
    }
    const playerValue = CardGames.handValue(playerHand);
    const dealerValue = CardGames.handValue(dealerHand);

    let playerWon = false;
    let push = false;
    if (dealerValue > 21) playerWon = true;
    else if (playerValue > dealerValue) playerWon = true;
    else if (playerValue === dealerValue) push = true;

    return {
      playerHand, dealerHand, playerValue, dealerValue,
      finished: true, playerWon, push,
    };
  }

  // ── POKER (Texas Hold'em đơn giản — đánh giá bài) ──
  static evaluatePokerHand(cards: Card[]): { rank: number; name: string } {
    // Đơn giản hóa: trả về hạng bài 5 lá
    // 9=Royal Flush ... 1=High Card
    const values = cards.map((c) => c.value).sort((a, b) => b - a);
    const suits = cards.map((c) => c.suit);
    const isFlush = new Set(suits).size === 1;
    const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
    const isStraight = uniqueVals.length === 5 && uniqueVals[0] - uniqueVals[4] === 4;

    const counts: Record<number, number> = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;
    const countVals = Object.values(counts).sort((a, b) => b - a);

    if (isStraight && isFlush) return { rank: 9, name: 'Thùng phá sảnh' };
    if (countVals[0] === 4) return { rank: 8, name: 'Tứ quý' };
    if (countVals[0] === 3 && countVals[1] === 2) return { rank: 7, name: 'Cù lũ' };
    if (isFlush) return { rank: 6, name: 'Thùng' };
    if (isStraight) return { rank: 5, name: 'Sảnh' };
    if (countVals[0] === 3) return { rank: 4, name: 'Sám cô' };
    if (countVals[0] === 2 && countVals[1] === 2) return { rank: 3, name: 'Thú' };
    if (countVals[0] === 2) return { rank: 2, name: 'Đôi' };
    return { rank: 1, name: 'Mậu thầu' };
  }

  // ── TIẾN LÊN — sắp bài, chia 13 lá/người ──
  static tienLenDeal(numPlayers: number): Card[][] {
    const deck = CardGames.createDeck();
    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
    for (let i = 0; i < 52; i++) {
      hands[i % numPlayers].push(deck[i]);
    }
    // Sắp xếp theo luật tiến lên (3 nhỏ nhất → 2 lớn nhất)
    const tlOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    for (const hand of hands) {
      hand.sort((a, b) => tlOrder.indexOf(a.rank) - tlOrder.indexOf(b.rank));
    }
    return hands;
  }
}
