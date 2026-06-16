// Engine Đua Thú — đua 7 con thú, đặt 1 con, "đặt 1 ăn 5"
// Dựa trên mod đua thú cổ điển (7 racer, chọn ngẫu nhiên con thắng + animation tốc độ)

export interface RaceAnimal {
  lane: number; // 1..7
  slug: string;
  name: string;
  asset: string; // tên file gif
}

export interface RaceLaneResult {
  lane: number;
  rank: number; // 1 = về nhất
  finishMs: number; // thời điểm về đích (ms)
  speed: number; // scrollamount để frontend animate (1-10)
}

export interface RaceResult {
  winner: number; // lane về nhất (1..7)
  results: RaceLaneResult[]; // sắp theo rank
  durationMs: number; // tổng thời lượng đua
  frames: number[][]; // [tick][lane-1] = % tiến độ 0..100 (cho animation)
}

export class RaceGame {
  static readonly LANE_COUNT = 7;
  static readonly PAYOUT_MULTIPLIER = 5; // đặt 1 ăn 5

  // 7 con thú theo bản gốc
  static readonly ANIMALS: RaceAnimal[] = [
    { lane: 1, slug: 'thanh-nhim', name: 'Thánh nhím', asset: '1.gif' },
    { lane: 2, slug: 'rong-huyen-thoai', name: 'Rồng huyền thoại', asset: '2.gif' },
    { lane: 3, slug: 'ran-tho-san', name: 'Rắn thợ săn', asset: '3.gif' },
    { lane: 4, slug: 'mini-totoro', name: 'Mini Totoro', asset: '4.gif' },
    { lane: 5, slug: 'con-buom-xinh', name: 'Con bướm xinh', asset: '5.gif' },
    { lane: 6, slug: 'nguoi-ngoai-hanh-tinh', name: 'Người ngoài hành tinh', asset: '6.gif' },
    { lane: 7, slug: 'khung-long-phun-nua', name: 'Khủng long phun nửa', asset: '7.gif' },
  ];

  // Mô phỏng 1 lượt đua. Con thắng được chọn ngẫu nhiên đều (xác suất 1/7 mỗi con).
  static simulate(laneCount = RaceGame.LANE_COUNT, ticks = 24): RaceResult {
    const winner = 1 + Math.floor(Math.random() * laneCount);

    // Gán thời điểm về đích ngẫu nhiên cho mỗi lane (8s - 12s)
    const lanes = Array.from({ length: laneCount }, (_, i) => ({
      lane: i + 1,
      finishMs: 8000 + Math.random() * 4000,
    }));

    // Ép con thắng về đích sớm nhất
    const minFinish = Math.min(...lanes.map((l) => l.finishMs));
    const winnerLane = lanes.find((l) => l.lane === winner)!;
    winnerLane.finishMs = minFinish - (200 + Math.random() * 400);

    const durationMs = Math.max(...lanes.map((l) => l.finishMs));

    // Xếp hạng theo thời điểm về đích
    const ordered = [...lanes].sort((a, b) => a.finishMs - b.finishMs);
    const results: RaceLaneResult[] = ordered.map((l, idx) => ({
      lane: l.lane,
      rank: idx + 1,
      finishMs: Math.round(l.finishMs),
      // scrollamount: con nhanh hơn -> số lớn hơn (10 cho con thắng)
      speed: Math.max(1, Math.round(10 - (idx * 8) / Math.max(1, laneCount - 1))),
    }));

    // Tạo frame tiến độ cho animation (tăng đơn điệu, về đích = 100%)
    const frames: number[][] = [];
    const byLane = new Map(lanes.map((l) => [l.lane, l.finishMs]));
    for (let t = 1; t <= ticks; t++) {
      const elapsed = (durationMs * t) / ticks;
      const row: number[] = [];
      for (let lane = 1; lane <= laneCount; lane++) {
        const finishMs = byLane.get(lane)!;
        row.push(Math.min(100, Math.round((elapsed / finishMs) * 100)));
      }
      frames.push(row);
    }

    return { winner, results, durationMs: Math.round(durationMs), frames };
  }
}
