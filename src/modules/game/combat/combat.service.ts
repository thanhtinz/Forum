import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CharacterService } from '../character/character.service';
import { BattleResult } from '@prisma/client';

interface CombatStats {
  hp: number;
  atk: number;
  def: number;
  agility: number;
  intelligence: number;
}

export interface BattleRound {
  turn: number;
  attacker: 'A' | 'B';
  skillUsed?: string;
  damage: number;
  isCrit: boolean;
  attackerHp: number;
  defenderHp: number;
}

@Injectable()
export class CombatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // ──────────────────────────────────────────────
  // PvP AUTO — mô phỏng turn-based tự động
  // ──────────────────────────────────────────────
  async pvpAuto(userId: string, targetCharacterId: string) {
    const attacker = await this.loadFighter(userId);
    const defender = await this.loadFighterById(targetCharacterId);

    if (attacker.id === defender.id)
      throw new BadRequestException('Không thể đấu với chính mình');

    const { rounds, result } = this.simulate(
      attacker.stats, defender.stats,
      attacker.name, defender.name,
    );

    return this.resolveBattle('PVP_AUTO', attacker, defender, result, rounds);
  }

  // ──────────────────────────────────────────────
  // PvP MANUAL — bắt đầu trận, trả về state để client chọn skill
  // ──────────────────────────────────────────────
  async pvpManualStart(userId: string, targetCharacterId: string) {
    const attacker = await this.loadFighter(userId);
    const defender = await this.loadFighterById(targetCharacterId);

    // Lưu battle state vào Redis (ở đây trả về cho client giữ)
    return {
      battleToken: `${attacker.id}_${defender.id}_${Date.now()}`,
      attacker: {
        id: attacker.id, name: attacker.name,
        hp: attacker.stats.hp, maxHp: attacker.stats.hp,
        skills: attacker.skills,
      },
      defender: {
        id: defender.id, name: defender.name,
        hp: defender.stats.hp, maxHp: defender.stats.hp,
      },
      turn: 'attacker',
    };
  }

  // Manual: xử lý 1 lượt người chơi chọn skill
  async pvpManualTurn(userId: string, payload: {
    battleToken: string;
    attackerStats: CombatStats;
    defenderStats: CombatStats;
    attackerHp: number;
    defenderHp: number;
    skillMultiplier?: number;
  }) {
    const { attackerStats, defenderStats, skillMultiplier = 1 } = payload;

    // Người chơi đánh
    const playerDmg = this.calcDamage(attackerStats, defenderStats, skillMultiplier);
    let defenderHp = Math.max(0, payload.defenderHp - playerDmg.damage);

    const rounds: BattleRound[] = [{
      turn: 1, attacker: 'A', damage: playerDmg.damage, isCrit: playerDmg.isCrit,
      attackerHp: payload.attackerHp, defenderHp,
    }];

    let attackerHp = payload.attackerHp;
    let finished = defenderHp <= 0;

    // Đối thủ phản công (AI đơn giản)
    if (!finished) {
      const enemyDmg = this.calcDamage(defenderStats, attackerStats, 1);
      attackerHp = Math.max(0, attackerHp - enemyDmg.damage);
      rounds.push({
        turn: 2, attacker: 'B', damage: enemyDmg.damage, isCrit: enemyDmg.isCrit,
        attackerHp, defenderHp,
      });
      finished = attackerHp <= 0;
    }

    return {
      rounds, attackerHp, defenderHp, finished,
      result: finished ? (defenderHp <= 0 ? 'WIN' : 'LOSE') : null,
    };
  }

  // ──────────────────────────────────────────────
  // MÔ PHỎNG TRẬN ĐẤU (auto)
  // ──────────────────────────────────────────────
  private simulate(a: CombatStats, b: CombatStats, nameA: string, nameB: string) {
    let hpA = a.hp;
    let hpB = b.hp;
    const rounds: BattleRound[] = [];
    let turn = 0;
    const maxTurns = 50;

    // Ai nhanh hơn đánh trước
    let aFirst = a.agility >= b.agility;

    while (hpA > 0 && hpB > 0 && turn < maxTurns) {
      turn++;
      if (aFirst) {
        const dmg = this.calcDamage(a, b, 1);
        hpB = Math.max(0, hpB - dmg.damage);
        rounds.push({ turn, attacker: 'A', damage: dmg.damage, isCrit: dmg.isCrit, attackerHp: hpA, defenderHp: hpB });
        if (hpB <= 0) break;

        const dmg2 = this.calcDamage(b, a, 1);
        hpA = Math.max(0, hpA - dmg2.damage);
        rounds.push({ turn, attacker: 'B', damage: dmg2.damage, isCrit: dmg2.isCrit, attackerHp: hpA, defenderHp: hpB });
      } else {
        const dmg = this.calcDamage(b, a, 1);
        hpA = Math.max(0, hpA - dmg.damage);
        rounds.push({ turn, attacker: 'B', damage: dmg.damage, isCrit: dmg.isCrit, attackerHp: hpA, defenderHp: hpB });
        if (hpA <= 0) break;

        const dmg2 = this.calcDamage(a, b, 1);
        hpB = Math.max(0, hpB - dmg2.damage);
        rounds.push({ turn, attacker: 'A', damage: dmg2.damage, isCrit: dmg2.isCrit, attackerHp: hpA, defenderHp: hpB });
      }
    }

    let result: BattleResult;
    if (hpA > 0 && hpB <= 0) result = 'WIN';
    else if (hpB > 0 && hpA <= 0) result = 'LOSE';
    else result = hpA >= hpB ? 'WIN' : 'LOSE';

    return { rounds, result };
  }

  // ──────────────────────────────────────────────
  // CÔNG THỨC SÁT THƯƠNG
  // ──────────────────────────────────────────────
  private calcDamage(attacker: CombatStats, defender: CombatStats, skillMul: number) {
    const baseAtk = attacker.atk + attacker.intelligence;
    const mitigated = baseAtk * (100 / (100 + defender.def));
    // Crit dựa trên agility
    const critChance = Math.min(0.5, attacker.agility * 0.005);
    const isCrit = Math.random() < critChance;
    const critMul = isCrit ? 1.5 : 1;
    // Variance ±10%
    const variance = 0.9 + Math.random() * 0.2;
    const damage = Math.max(1, Math.floor(mitigated * skillMul * critMul * variance));
    return { damage, isCrit };
  }

  // ──────────────────────────────────────────────
  // GIẢI QUYẾT TRẬN ĐẤU: cập nhật elo, exp, coin
  // ──────────────────────────────────────────────
  private async resolveBattle(
    type: any,
    attacker: any,
    defender: any,
    result: BattleResult,
    rounds: BattleRound[],
  ) {
    const won = result === 'WIN';
    // Elo
    const expected = 1 / (1 + Math.pow(10, (defender.pvpRank - attacker.pvpRank) / 400));
    const K = 32;
    const rankChange = Math.round(K * ((won ? 1 : 0) - expected));

    const expGained = won ? 50 : 20;
    const coinGained = won ? 100 : 30;

    await this.prisma.$transaction(async (tx) => {
      await tx.gameCharacter.update({
        where: { id: attacker.id },
        data: {
          pvpRank: { increment: rankChange },
          pvpWins: won ? { increment: 1 } : undefined,
          pvpLosses: !won ? { increment: 1 } : undefined,
          coinBalance: { increment: coinGained },
        },
      });

      await tx.gameCharacter.update({
        where: { id: defender.id },
        data: {
          pvpRank: { decrement: Math.floor(rankChange / 2) },
          pvpWins: !won ? { increment: 1 } : undefined,
          pvpLosses: won ? { increment: 1 } : undefined,
        },
      });

      await tx.battle.create({
        data: {
          type,
          attackerId: attacker.id,
          defenderId: defender.id,
          result,
          attackerPowerBefore: attacker.combatPower,
          defenderPowerBefore: defender.combatPower,
          rounds: rounds as any,
          expGained, coinGained, rankChange,
        },
      });

      await tx.coinTransaction.create({
        data: {
          characterId: attacker.id,
          type: 'earn_battle',
          amount: coinGained,
          balanceBefore: attacker.coinBalance,
          balanceAfter: attacker.coinBalance + coinGained,
          note: `${won ? 'Thắng' : 'Thua'} PvP`,
        },
      });
    });

    return {
      result, rounds, rankChange, expGained, coinGained,
      attacker: { name: attacker.name },
      defender: { name: defender.name },
    };
  }

  // ──────────────────────────────────────────────
  // LOAD FIGHTER
  // ──────────────────────────────────────────────
  private async loadFighter(userId: string) {
    const char = await this.character.getCharacter(userId);
    return {
      id: char.id,
      name: (char as any).user?.username ?? 'Player',
      stats: this.toCombatStats(char.totalStats),
      skills: char.skills?.map((s: any) => ({
        id: s.skill.id, name: s.skill.name,
        damageMultiplier: s.skill.damageMultiplier, manaCost: s.skill.manaCost,
      })) ?? [],
      combatPower: char.combatPower,
      pvpRank: char.pvpRank,
      coinBalance: char.coinBalance,
    };
  }

  private async loadFighterById(characterId: string) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      include: {
        user: { select: { username: true } },
        equipped: { include: { inventoryItem: { include: { template: true } } } },
      },
    });
    if (!char) throw new NotFoundException('Đối thủ không tồn tại');
    const totalStats = this.character.computeTotalStats(char);
    return {
      id: char.id,
      name: char.user.username,
      stats: this.toCombatStats(totalStats),
      combatPower: char.combatPower,
      pvpRank: char.pvpRank,
      coinBalance: char.coinBalance,
    };
  }

  private toCombatStats(s: any): CombatStats {
    return { hp: s.hp, atk: s.atk, def: s.def, agility: s.agility, intelligence: s.intelligence };
  }

  // ──────────────────────────────────────────────
  // MATCHMAKING — tìm đối thủ cùng rank
  // ──────────────────────────────────────────────
  async findOpponents(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    return this.prisma.gameCharacter.findMany({
      where: {
        userId: { not: userId },
        pvpRank: { gte: char.pvpRank - 200, lte: char.pvpRank + 200 },
      },
      take: 10,
      orderBy: { pvpRank: 'desc' },
      include: { user: { select: { username: true, avatar: true } } },
    });
  }
}
