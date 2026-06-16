import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvatarSlot, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Tủ đồ cosmetic (port từ Avatar): quần áo/tóc/mũ/cánh + thú cưng + thú cưỡi.
// Chỉ dùng coin. Mỗi slot mặc 1 món (PET/MOUNT cũng 1 con active).
@Injectable()
export class WardrobeService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Cửa hàng (lọc theo slot + giới tính nhân vật) ──
  async shop(userId: string, slot?: AvatarSlot) {
    const char = await this.getCharacter(userId);
    const charGender = char.gender === 'MALE' ? 1 : 2;

    const where: Prisma.AvatarItemTemplateWhereInput = {
      ...(slot ? { slot } : {}),
      gender: { in: [0, charGender] },
    };
    const [items, owned] = await Promise.all([
      this.prisma.avatarItemTemplate.findMany({
        where,
        orderBy: [{ slot: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.userAvatarItem.findMany({
        where: { characterId: char.id },
        select: { templateId: true },
      }),
    ]);
    const ownedSet = new Set(owned.map((o) => o.templateId));
    return items.map((it) => ({
      slug: it.slug,
      name: it.name,
      slot: it.slot,
      priceCoin: it.priceCoin,
      reqLevel: it.reqLevel,
      expiredDay: it.expiredDay,
      asset: it.asset,
      owned: ownedSet.has(it.id),
    }));
  }

  // ── Mua (coin) ──
  async buy(userId: string, slug: string) {
    const char = await this.getCharacter(userId);
    const tpl = await this.prisma.avatarItemTemplate.findUnique({ where: { slug } });
    if (!tpl) throw new NotFoundException('Vật phẩm không tồn tại');
    if (tpl.gender !== 0 && tpl.gender !== (char.gender === 'MALE' ? 1 : 2)) {
      throw new BadRequestException('Vật phẩm không dành cho giới tính của bạn');
    }
    if (char.level < tpl.reqLevel) {
      throw new BadRequestException(`Cần đạt cấp ${tpl.reqLevel}`);
    }

    const existing = await this.prisma.userAvatarItem.findUnique({
      where: { characterId_templateId: { characterId: char.id, templateId: tpl.id } },
    });
    const now = Date.now();
    if (existing && (!existing.expiresAt || existing.expiresAt.getTime() > now)) {
      throw new BadRequestException('Bạn đã sở hữu vật phẩm này');
    }

    const expiresAt = tpl.expiredDay > 0 ? new Date(now + tpl.expiredDay * 86400 * 1000) : null;
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, tpl.priceCoin, `wardrobe_${tpl.slug}`, `Mua ${tpl.name}`);
      await tx.userAvatarItem.upsert({
        where: { characterId_templateId: { characterId: char.id, templateId: tpl.id } },
        update: { expiresAt, acquiredAt: new Date() },
        create: { characterId: char.id, templateId: tpl.id, expiresAt },
      });
    });
    return { ok: true, item: tpl.name, spent: tpl.priceCoin, expiresAt };
  }

  // ── Mặc / trang bị ──
  async equip(userId: string, slug: string) {
    const char = await this.getCharacter(userId);
    const owned = await this.prisma.userAvatarItem.findFirst({
      where: { characterId: char.id, template: { slug } },
      include: { template: true },
    });
    if (!owned) throw new NotFoundException('Bạn chưa sở hữu vật phẩm này');
    if (owned.expiresAt && owned.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Vật phẩm đã hết hạn');
    }

    await this.prisma.$transaction(async (tx) => {
      // bỏ món cùng slot đang mặc
      await tx.userAvatarItem.updateMany({
        where: { characterId: char.id, equipped: true, template: { slot: owned.template.slot } },
        data: { equipped: false },
      });
      await tx.userAvatarItem.update({ where: { id: owned.id }, data: { equipped: true } });
    });
    return { ok: true, equipped: owned.template.name, slot: owned.template.slot };
  }

  async unequip(userId: string, slug: string) {
    const char = await this.getCharacter(userId);
    const owned = await this.prisma.userAvatarItem.findFirst({
      where: { characterId: char.id, template: { slug }, equipped: true },
    });
    if (!owned) throw new NotFoundException('Vật phẩm chưa được mặc');
    await this.prisma.userAvatarItem.update({ where: { id: owned.id }, data: { equipped: false } });
    return { ok: true };
  }

  // ── Túi đồ của tôi ──
  async inventory(userId: string) {
    const char = await this.getCharacter(userId);
    const items = await this.prisma.userAvatarItem.findMany({
      where: { characterId: char.id },
      include: { template: true },
      orderBy: { acquiredAt: 'desc' },
    });
    const now = Date.now();
    return items.map((i) => ({
      slug: i.template.slug,
      name: i.template.name,
      slot: i.template.slot,
      asset: i.template.asset,
      equipped: i.equipped,
      expiresAt: i.expiresAt,
      expired: i.expiresAt ? i.expiresAt.getTime() <= now : false,
    }));
  }

  // ── Diện mạo hiện tại (cho render avatar): equipped theo slot + pet + mount ──
  async look(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { gameCharacter: { select: { id: true, gender: true } } },
    });
    const charId = user?.gameCharacter?.id;
    if (!charId) throw new NotFoundException('Không tìm thấy nhân vật');

    const equipped = await this.prisma.userAvatarItem.findMany({
      where: { characterId: charId, equipped: true },
      include: { template: true },
    });
    const now = Date.now();
    const layers = equipped
      .filter((e) => !e.expiresAt || e.expiresAt.getTime() > now)
      .map((e) => ({
        slot: e.template.slot,
        name: e.template.name,
        asset: e.template.asset,
        zorder: e.template.zorder,
      }))
      .sort((a, b) => a.zorder - b.zorder);

    return {
      gender: user!.gameCharacter!.gender,
      layers: layers.filter((l) => l.slot !== 'PET' && l.slot !== 'MOUNT'),
      pet: layers.find((l) => l.slot === 'PET') ?? null,
      mount: layers.find((l) => l.slot === 'MOUNT') ?? null,
    };
  }

  // ── helpers ──
  private async getCharacter(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Bạn chưa tạo nhân vật game');
    return char;
  }

  private async spendCoin(tx: Prisma.TransactionClient, characterId: string, amount: number, refId: string, note: string) {
    const char = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
    if (!char) throw new NotFoundException();
    if (char.coinBalance < amount) throw new BadRequestException('Không đủ coin');
    const balanceAfter = char.coinBalance - amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
    await tx.coinTransaction.create({
      data: { characterId, type: 'spend_wardrobe', amount: -amount, balanceBefore: char.coinBalance, balanceAfter, refId, note },
    });
  }
}
