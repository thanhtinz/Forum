import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FarmService } from './farm.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/roles.decorator';

@Controller('farm')
@UseGuards(JwtAuthGuard)
export class FarmController {
  constructor(private readonly farm: FarmService) {}

  @Get('state')
  state(@CurrentUser('id') userId: string) {
    return this.farm.getState(userId);
  }

  @Post('khe/water')
  waterKhe(@CurrentUser('id') userId: string) {
    return this.farm.waterKhe(userId);
  }

  @Post('khe/harvest')
  harvestKhe(@CurrentUser('id') userId: string) {
    return this.farm.harvestKhe(userId);
  }

  // ── Đất + trồng trọt (ô đất mở khoá theo cấp, không mua) ──
  @Get('crops')
  crops() {
    return this.farm.listCrops();
  }

  @Post('seed/buy')
  buySeed(@CurrentUser('id') userId: string, @Body() b: { cropSlug: string; qty?: number }) {
    return this.farm.buySeed(userId, b.cropSlug, Number(b.qty ?? 1));
  }

  @Post('till')
  till(@CurrentUser('id') userId: string, @Body('plotIndex') plotIndex: number) {
    return this.farm.till(userId, Number(plotIndex));
  }

  @Post('plant')
  plant(@CurrentUser('id') userId: string, @Body() b: { plotIndex: number; cropSlug: string }) {
    return this.farm.plant(userId, Number(b.plotIndex), b.cropSlug);
  }

  @Post('water')
  water(@CurrentUser('id') userId: string, @Body('plotIndex') plotIndex: number) {
    return this.farm.water(userId, Number(plotIndex));
  }

  @Post('fertilize')
  fertilize(@CurrentUser('id') userId: string, @Body() b: { plotIndex: number; fertilizerSlug: string }) {
    return this.farm.applyFertilizer(userId, Number(b.plotIndex), b.fertilizerSlug);
  }

  @Post('harvest')
  harvest(@CurrentUser('id') userId: string, @Body('plotIndex') plotIndex: number) {
    return this.farm.harvest(userId, Number(plotIndex));
  }

  // ── Phân bón ──
  @Get('fertilizers')
  fertilizers() {
    return this.farm.listFertilizers();
  }

  @Post('fertilizer/buy')
  buyFertilizer(@CurrentUser('id') userId: string, @Body() b: { slug: string; qty?: number }) {
    return this.farm.buyFertilizer(userId, b.slug, Number(b.qty ?? 1));
  }

  // ── Kho + bán ──
  @Post('sell')
  sell(@CurrentUser('id') userId: string, @Body() b: { slug: string; category: string; qty?: number }) {
    return this.farm.sell(userId, b.slug, b.category, Number(b.qty ?? 1));
  }

  // ── Vật nuôi ──
  @Get('animals')
  animals() {
    return this.farm.listAnimals();
  }

  @Post('animal/buy')
  buyAnimal(@CurrentUser('id') userId: string, @Body('slug') slug: string) {
    return this.farm.buyAnimal(userId, slug);
  }

  @Post('animal/feed')
  feed(@CurrentUser('id') userId: string, @Body('animalId') animalId: string) {
    return this.farm.feedAnimal(userId, animalId);
  }

  @Post('animal/collect')
  collect(@CurrentUser('id') userId: string, @Body('animalId') animalId: string) {
    return this.farm.collectAnimal(userId, animalId);
  }

  @Post('animal/sell')
  sellAnimal(@CurrentUser('id') userId: string, @Body('animalId') animalId: string) {
    return this.farm.sellAnimal(userId, animalId);
  }

  // ── Nhà bếp ──
  @Get('recipes')
  recipes(@CurrentUser('id') userId: string) {
    return this.farm.listRecipes(userId);
  }

  @Post('kitchen/learn')
  learn(@CurrentUser('id') userId: string, @Body('recipeSlug') recipeSlug: string) {
    return this.farm.learnSkill(userId, recipeSlug);
  }

  @Post('kitchen/cook')
  cook(@CurrentUser('id') userId: string, @Body('recipeSlug') recipeSlug: string) {
    return this.farm.cook(userId, recipeSlug);
  }

  @Post('kitchen/collect')
  collectDishes(@CurrentUser('id') userId: string) {
    return this.farm.collectDishes(userId);
  }

  @Post('kitchen/upgrade')
  upgradeKitchen(@CurrentUser('id') userId: string) {
    return this.farm.upgradeKitchen(userId);
  }

  // ── Chó / điểm danh / ăn trộm ──
  @Post('dog/buy')
  buyDog(@CurrentUser('id') userId: string) {
    return this.farm.buyDog(userId);
  }

  @Post('checkin')
  checkin(@CurrentUser('id') userId: string) {
    return this.farm.dailyCheckin(userId);
  }

  @Get('raid/:username')
  viewFarm(@Param('username') username: string) {
    return this.farm.viewFarm(username);
  }

  @Post('steal')
  steal(@CurrentUser('id') userId: string, @Body() b: { username: string; plotIndex: number }) {
    return this.farm.steal(userId, b.username, Number(b.plotIndex));
  }
}
