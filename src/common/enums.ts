// Currency được khai báo trong schema.prisma nhưng không model nào tham chiếu,
// nên Prisma Client không generate ra. Khai báo lại ở đây để dùng trong logic
// (COIN: kiếm trong game, không rút; GEM: nạp/rút được).
export enum Currency {
  COIN = 'COIN',
  GEM = 'GEM',
}
