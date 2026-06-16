// Engine máy quay Jackpot 777 (slot machine)
// 3 reels x 3 rows, 6 symbols

export interface SlotSymbol {
  slug: string;
  name: string;
  weight: number;   // tần suất xuất hiện
  payout3: number;  // hệ số khi 3 ô giống nhau trên payline
  payout2: number;  // hệ số khi 2 ô giống nhau
}

// Cấu hình symbol (theo asset đã nhận diện)
// cherry dễ ra (payout thấp), seven hiếm (jackpot)
export const JACKPOT_SYMBOLS: SlotSymbol[] = [
  { slug: 'cherry', name: 'Cherry', weight: 30, payout3: 5, payout2: 2 },
  { slug: 'lemon', name: 'Chanh', weight: 25, payout3: 8, payout2: 2 },
  { slug: 'bell', name: 'Chuông', weight: 20, payout3: 12, payout2: 3 },
  { slug: 'bar', name: 'BAR', weight: 13, payout3: 20, payout2: 4 },
  { slug: 'coin', name: 'Đồng Xu', weight: 9, payout3: 40, payout2: 6 },
  { slug: 'seven', name: 'Số 7', weight: 3, payout3: 200, payout2: 10 }, // 777 = jackpot
];

export interface SpinResult {
  grid: string[][];       // 3x3 lưới symbol slug
  paylines: PaylineWin[]; // các dòng thắng
  totalMultiplier: number;
  isJackpot: boolean;     // 777 trên payline giữa
}

export interface PaylineWin {
  line: number;           // 0=giữa, 1=trên, 2=dưới, 3=chéo\, 4=chéo/
  symbol: string;
  count: number;
  multiplier: number;
}

// 5 payline: ngang giữa, ngang trên, ngang dưới, chéo xuống, chéo lên
const PAYLINES = [
  [[0, 1], [1, 1], [2, 1]], // giữa
  [[0, 0], [1, 0], [2, 0]], // trên
  [[0, 2], [1, 2], [2, 2]], // dưới
  [[0, 0], [1, 1], [2, 2]], // chéo \
  [[0, 2], [1, 1], [2, 0]], // chéo /
];

export class JackpotGame {
  // Quay 1 lần với số payline active (1-5)
  static spin(activeLines = 5): SpinResult {
    // Tạo lưới 3 cột x 3 hàng
    const grid: string[][] = [];
    for (let col = 0; col < 3; col++) {
      grid.push([
        JackpotGame.randomSymbol(),
        JackpotGame.randomSymbol(),
        JackpotGame.randomSymbol(),
      ]);
    }

    const paylines: PaylineWin[] = [];
    let totalMultiplier = 0;
    let isJackpot = false;

    for (let l = 0; l < Math.min(activeLines, PAYLINES.length); l++) {
      const line = PAYLINES[l];
      const symbols = line.map(([c, r]) => grid[c][r]);

      // Đếm symbol giống từ trái sang
      const first = symbols[0];
      let count = 1;
      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === first) count++;
        else break;
      }

      if (count >= 2) {
        const symDef = JACKPOT_SYMBOLS.find((s) => s.slug === first)!;
        const mul = count === 3 ? symDef.payout3 : symDef.payout2;
        paylines.push({ line: l, symbol: first, count, multiplier: mul });
        totalMultiplier += mul;

        // Jackpot: 777 trên payline giữa
        if (first === 'seven' && count === 3 && l === 0) {
          isJackpot = true;
        }
      }
    }

    return { grid, paylines, totalMultiplier, isJackpot };
  }

  private static randomSymbol(): string {
    const totalWeight = JACKPOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * totalWeight;
    for (const sym of JACKPOT_SYMBOLS) {
      if (r < sym.weight) return sym.slug;
      r -= sym.weight;
    }
    return JACKPOT_SYMBOLS[0].slug;
  }
}
