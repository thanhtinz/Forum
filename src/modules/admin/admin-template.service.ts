import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// CRUD chung cho các bảng template game (admin quản lý dữ liệu auto-seed).
export type TemplateType = 'crop' | 'fish' | 'fishdepth' | 'fishingrod' | 'fishingboat' | 'fertilizer' | 'animal' | 'gempackage' | 'consumable';

const DELEGATE: Record<TemplateType, string> = {
  crop: 'cropTemplate',
  fish: 'fishSpecies',
  fishdepth: 'fishDepth',
  fishingrod: 'fishingRod',
  fishingboat: 'fishingBoat',
  fertilizer: 'fertilizerTemplate',
  animal: 'animalTemplate',
  gempackage: 'gemPackage',
  consumable: 'consumableTemplate',
};

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
    return this.model(type).findMany({ orderBy: { sortOrder: 'asc' } });
  }

  create(type: TemplateType, data: Record<string, unknown>) {
    delete data.id;
    // Bỏ field null/undefined để Prisma dùng @default thay vì lỗi "must not be null"
    for (const k of Object.keys(data)) if (data[k] === null || data[k] === undefined) delete data[k];
    return this.model(type).create({ data });
  }

  update(type: TemplateType, id: string, data: Record<string, unknown>) {
    delete data.id;
    return this.model(type).update({ where: { id }, data });
  }

  async remove(type: TemplateType, id: string) {
    await this.model(type).delete({ where: { id } });
    return { ok: true };
  }
}
