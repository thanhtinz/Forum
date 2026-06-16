// Engine cờ Caro (Gomoku) 15x15, thắng khi 5 quân liên tiếp

const SIZE = 15;
const WIN_COUNT = 5;

export interface CaroState {
  board: number[][];  // 0 = trống, 1 = player 0, 2 = player 1
  currentTurn: number; // seatIndex đang đi
  moveCount: number;
  winner: number | null; // seatIndex thắng, null = chưa kết thúc
  lastMove: { x: number; y: number } | null;
}

export class CaroGame {
  static initState(): CaroState {
    return {
      board: Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
      currentTurn: 0,
      moveCount: 0,
      winner: null,
      lastMove: null,
    };
  }

  static move(state: CaroState, seatIndex: number, x: number, y: number): CaroState {
    if (state.winner != null) throw new Error('Ván đã kết thúc');
    if (seatIndex !== state.currentTurn) throw new Error('Chưa đến lượt bạn');
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) throw new Error('Vị trí không hợp lệ');
    if (state.board[y][x] !== 0) throw new Error('Ô đã có quân');

    const mark = seatIndex + 1;
    const board = state.board.map((row) => [...row]);
    board[y][x] = mark;

    const won = CaroGame.checkWin(board, x, y, mark);

    return {
      board,
      currentTurn: 1 - seatIndex,
      moveCount: state.moveCount + 1,
      winner: won ? seatIndex : state.moveCount + 1 >= SIZE * SIZE ? -1 : null, // -1 = hòa
      lastMove: { x, y },
    };
  }

  // Kiểm tra 5 quân liên tiếp qua điểm vừa đánh
  private static checkWin(board: number[][], x: number, y: number, mark: number): boolean {
    const directions = [
      [1, 0], [0, 1], [1, 1], [1, -1], // ngang, dọc, chéo \, chéo /
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      // Đếm 1 hướng
      for (let i = 1; i < WIN_COUNT; i++) {
        const nx = x + dx * i, ny = y + dy * i;
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || board[ny][nx] !== mark) break;
        count++;
      }
      // Đếm hướng ngược lại
      for (let i = 1; i < WIN_COUNT; i++) {
        const nx = x - dx * i, ny = y - dy * i;
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || board[ny][nx] !== mark) break;
        count++;
      }
      if (count >= WIN_COUNT) return true;
    }
    return false;
  }
}
