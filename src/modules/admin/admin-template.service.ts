import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// CRUD chung cho các bảng template game (admin quản lý dữ liệu auto-seed).
export type TemplateType = 'crop' | 'fish' | 'fishdepth' | 'fishingrod' | 'fishingboat' | 'fertilizer' | 'animal' | 'recipe' | 'avatar' | 'gempackage' | 'consumable';

const DELEGATE: Record<TemplateType, string> = {
  crop: 'cropTemplate',
  fish: 'fishSpecies',
  fishdepth: 'fishDepth',
  fishingrod: 'fishingRod',
  fishingboat: 'fishingBoat',
  fertilizer: 'fertilizerTemplate',
  animal: 'animalTemplate',
  recipe: 'recipeTemplate',
  avatar: 'avatarItemTemplate',
  gempackage: 'gemPackage',
  consumable: 'consumableTemplate',
};

interface IngredientInput { cropSlug: string; name: string; quantity: number }

@Injectable()
export class AdminTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  private model(type: TemplateType) {
    const name = DELEGATE[type];
    if (!name) throw new BadRequestException('Loại template không hợp lệ');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any)[name];
  }

  list(type: TemplateType) {
    if (type === 'recipe') {
      return this.model(type).findMany({ orderBy: { sortOrder: 'asc' }, include: { ingredients: true } });
    }
    return this.model(type).findMany({ orderBy: { sortOrder: 'asc' } });
  }

  // Danh sách nguyên liệu có thể chọn cho công thức (sản phẩm cây trồng, vật nuôi, cá).
  async ingredientOptions() {
    const [crops, animals, fish] = await Promise.all([
      this.prisma.cropTemplate.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true } }),
      this.prisma.animalTemplate.findMany({ orderBy: { sortOrder: 'asc' }, select: { productSlug: true, productName: true } }),
      this.prisma.fishSpecies.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true } }),
    ]);
    const out: { slug: string; name: string; group: string }[] = [];
    for (const c of crops) out.push({ slug: c.slug, name: c.name, group: 'Nông sản' });
    for (const a of animals) if (a.productSlug) out.push({ slug: a.productSlug, name: a.productName || a.productSlug, group: 'Sản phẩm vật nuôi' });
    for (const f of fish) out.push({ slug: f.slug, name: f.name, group: 'Cá' });
    // loại trùng slug
    const seen = new Set<string>();
    return out.filter((o) => (seen.has(o.slug) ? false : (seen.add(o.slug), true)));
  }

  private sanitizeIngredients(raw: unknown): IngredientInput[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((i: any) => ({ cropSlug: String(i?.cropSlug || '').trim(), name: String(i?.name || '').trim(), quantity: Math.max(1, Number(i?.quantity) || 1) }))
      .filter((i) => i.cropSlug);
  }

  create(type: TemplateType, data: Record<string, unknown>) {
    delete data.id;
    if (type === 'recipe') {
      const ingredients = this.sanitizeIngredients(data.ingredients);
      delete data.ingredients;
      return this.model(type).create({
        data: { ...data, ingredients: { create: ingredients } },
        include: { ingredients: true },
      });
    }
    return this.model(type).create({ data });
  }

  update(type: TemplateType, id: string, data: Record<string, unknown>) {
    delete data.id;
    if (type === 'recipe') {
      const hasIngredients = Array.isArray(data.ingredients);
      const ingredients = this.sanitizeIngredients(data.ingredients);
      delete data.ingredients;
      return this.model(type).update({
        where: { id },
        data: hasIngredients ? { ...data, ingredients: { deleteMany: {}, create: ingredients } } : data,
        include: { ingredients: true },
      });
    }
    return this.model(type).update({ where: { id }, data });
  }

  async remove(type: TemplateType, id: string) {
    await this.model(type).delete({ where: { id } });
    return { ok: true };
  }
}
