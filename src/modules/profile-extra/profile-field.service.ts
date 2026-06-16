import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateProfileFieldDto {
  key: string;
  label: string;
  type?: string;
  options?: unknown;
  required?: boolean;
  sortOrder?: number;
}

export type UpdateProfileFieldDto = Partial<CreateProfileFieldDto>;

const VALID_TYPES = ['text', 'textarea', 'url', 'select'];

@Injectable()
export class ProfileFieldService {
  constructor(private readonly prisma: PrismaService) {}

  listFields() {
    return this.prisma.profileField.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createField(data: CreateProfileFieldDto) {
    const type = data.type && VALID_TYPES.includes(data.type) ? data.type : 'text';
    return this.prisma.profileField.create({
      data: {
        key: data.key,
        label: data.label,
        type,
        options: (data.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        required: data.required ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  updateField(id: string, data: UpdateProfileFieldDto) {
    const patch: Prisma.ProfileFieldUpdateInput = {};
    if (data.key !== undefined) patch.key = data.key;
    if (data.label !== undefined) patch.label = data.label;
    if (data.type !== undefined) {
      patch.type = VALID_TYPES.includes(data.type) ? data.type : 'text';
    }
    if (data.options !== undefined) {
      patch.options = (data.options ?? Prisma.JsonNull) as Prisma.InputJsonValue;
    }
    if (data.required !== undefined) patch.required = data.required;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    return this.prisma.profileField.update({ where: { id }, data: patch });
  }

  deleteField(id: string) {
    return this.prisma.profileField.delete({ where: { id } });
  }

  async getUserValues(userId: string) {
    const [fields, values] = await Promise.all([
      this.prisma.profileField.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.userProfileFieldValue.findMany({ where: { userId } }),
    ]);
    const map = new Map(values.map((v) => [v.fieldId, v.value]));
    return fields.map((field) => ({ field, value: map.get(field.id) ?? '' }));
  }

  async setMyValues(userId: string, values: { fieldId: string; value: string }[]) {
    const fields = await this.prisma.profileField.findMany();
    const byId = new Map(fields.map((f) => [f.id, f]));
    const incoming = new Map((values ?? []).map((v) => [v.fieldId, v.value ?? '']));

    // Validate required fields are non-empty (using incoming where present,
    // otherwise existing stored value).
    const existing = await this.prisma.userProfileFieldValue.findMany({ where: { userId } });
    const existingMap = new Map(existing.map((e) => [e.fieldId, e.value]));

    for (const field of fields) {
      if (!field.required) continue;
      const effective = incoming.has(field.id)
        ? incoming.get(field.id)
        : existingMap.get(field.id);
      if (!effective || !effective.trim()) {
        throw new BadRequestException(`Trường "${field.label}" là bắt buộc`);
      }
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const [fieldId, rawValue] of incoming) {
      if (!byId.has(fieldId)) continue; // ignore unknown fieldIds
      const value = rawValue ?? '';
      ops.push(
        this.prisma.userProfileFieldValue.upsert({
          where: { userId_fieldId: { userId, fieldId } },
          create: { userId, fieldId, value },
          update: { value },
        }),
      );
    }
    await this.prisma.$transaction(ops);
    return this.getUserValues(userId);
  }
}
