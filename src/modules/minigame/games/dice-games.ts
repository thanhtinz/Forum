// Engine cho các game xúc xắc

export class DiceGames {
  // Tài Xỉu: 3 xúc xắc, tổng 4-10 = Xỉu, 11-17 = Tài (3 hoặc 18 = nhà cái ăn)
  static taiXiu(): { dice: number[]; total: number; outcome: 'tai' | 'xiu' | 'house' } {
    const dice = [DiceGames.roll(), DiceGames.roll(), DiceGames.roll()];
    const total = dice.reduce((a, b) => a + b, 0);

    let outcome: 'tai' | 'xiu' | 'house';
    if (total === 3 || total === 18) outcome = 'house'; // bộ ba = nhà cái ăn
    else if (total >= 11) outcome = 'tai';
    else outcome = 'xiu';

    return { dice, total, outcome };
  }

  // Bầu Cua: 3 xúc xắc với 6 mặt (bầu, cua, tôm, cá, gà, nai)
  static bauCua(): { dice: string[] } {
    const symbols = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];
    const dice = [
      symbols[Math.floor(Math.random() * 6)],
      symbols[Math.floor(Math.random() * 6)],
      symbols[Math.floor(Math.random() * 6)],
    ];
    return { dice };
  }

  private static roll(): number {
    return Math.floor(Math.random() * 6) + 1;
  }
}
