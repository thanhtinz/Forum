import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const BACKUP_VERSION = 1;

@Injectable()
export class AdminBackupService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // XUẤT: cấu hình site + cấu trúc danh mục/tag/nhóm quyền — KHÔNG gồm
  // nội dung (user/thread/post), chỉ cấu hình để sao lưu/nhân bản site.
  // ──────────────────────────────────────────────
  async exportBackup() {
    const [settings, categories, prefixes, tags, groups, catPerms] = await Promise.all([
      this.prisma.configSetting.findMany({ select: { key: true, value: true } }),
      this.prisma.category.findMany({
        select: {
          slug: true, name: true, description: true, icon: true, iconUrl: true, color: true,
          sortOrder: true, isPrivate: true, minRoleView: true, minRolePost: true, moduleType: true,
          requirePrefix: true, minTags: true, defaultSortOrder: true, countMessages: true, findNew: true,
          parent: { select: { slug: true } },
        },
      }),
      this.prisma.categoryPrefix.findMany({
        select: { label: true, color: true, sortOrder: true, category: { select: { slug: true } } },
      }),
      this.prisma.tag.findMany({ select: { name: true, slug: true, color: true } }),
      this.prisma.userGroup.findMany({
        select: {
          key: true, name: true, color: true, badgeIcon: true, priority: true, isSystem: true,
          permissions: true, autoPromote: true, minPosts: true, minReputation: true, minDays: true,
        },
      }),
      this.prisma.categoryPermission.findMany({
        select: { permission: true, value: true, category: { select: { slug: true } }, group: { select: { key: true } } },
      }),
    ]);

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      configSettings: settings,
      categories: categories.map((c) => ({ ...c, parentSlug: c.parent?.slug ?? null, parent: undefined })),
      categoryPrefixes: prefixes.map((p) => ({ label: p.label, color: p.color, sortOrder: p.sortOrder, categorySlug: p.category.slug })),
      tags,
      permissionGroups: groups,
      categoryPermissions: catPerms.map((p) => ({ permission: p.permission, value: p.value, categorySlug: p.category.slug, groupKey: p.group.key })),
    };
  }

  // ──────────────────────────────────────────────
  // NHẬP: khôi phục từ file sao lưu ở trên. Chỉ cập nhật value của config
  // đã tồn tại (không tạo key lạ); upsert danh mục/tag/nhóm quyền theo
  // định danh ổn định (slug/key) để phục hồi được lên site trống hoặc đã có dữ liệu.
  // ──────────────────────────────────────────────
  async importBackup(data: any, actorId: string) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.categories)) {
      throw new BadRequestException('File sao lưu không hợp lệ');
    }

    const summary = { configSettings: 0, categories: 0, categoryPrefixes: 0, tags: 0, permissionGroups: 0, categoryPermissions: 0 };

    await this.prisma.$transaction(async (tx) => {
      // 1) Config settings — chỉ ghi value cho key đã tồn tại (key do code định nghĩa)
      for (const s of data.configSettings ?? []) {
        if (!s?.key) continue;
        const r = await tx.configSetting.updateMany({ where: { key: s.key }, data: { value: s.value } });
        summary.configSettings += r.count;
      }

      // 2) Danh mục — upsert theo slug, 2 lượt để giải quyết parentSlug
      const slugToId = new Map<string, string>();
      for (const c of data.categories ?? []) {
        if (!c?.slug || !c?.name) continue;
        const row = await tx.category.upsert({
          where: { slug: c.slug },
          update: {
            name: c.name, description: c.description ?? null, icon: c.icon ?? null, iconUrl: c.iconUrl ?? null,
            color: c.color ?? null, sortOrder: c.sortOrder ?? 0, isPrivate: !!c.isPrivate,
            minRoleView: c.minRoleView ?? 'GUEST', minRolePost: c.minRolePost ?? 'MEMBER', moduleType: c.moduleType ?? 'NONE',
            requirePrefix: !!c.requirePrefix, minTags: c.minTags ?? 0, defaultSortOrder: c.defaultSortOrder ?? 'lastPost',
            countMessages: c.countMessages ?? true, findNew: c.findNew ?? true,
          },
          create: {
            slug: c.slug, name: c.name, description: c.description ?? null, icon: c.icon ?? null, iconUrl: c.iconUrl ?? null,
            color: c.color ?? null, sortOrder: c.sortOrder ?? 0, isPrivate: !!c.isPrivate,
            minRoleView: c.minRoleView ?? 'GUEST', minRolePost: c.minRolePost ?? 'MEMBER', moduleType: c.moduleType ?? 'NONE',
            requirePrefix: !!c.requirePrefix, minTags: c.minTags ?? 0, defaultSortOrder: c.defaultSortOrder ?? 'lastPost',
            countMessages: c.countMessages ?? true, findNew: c.findNew ?? true,
          },
        });
        slugToId.set(c.slug, row.id);
        summary.categories++;
      }
      for (const c of data.categories ?? []) {
        if (!c?.slug) continue;
        const parentId = c.parentSlug ? slugToId.get(c.parentSlug) ?? null : null;
        await tx.category.update({ where: { slug: c.slug }, data: { parentId } });
      }

      // 3) Tiền tố danh mục — upsert theo (categorySlug, label)
      for (const p of data.categoryPrefixes ?? []) {
        const categoryId = slugToId.get(p.categorySlug);
        if (!categoryId || !p.label) continue;
        const existing = await tx.categoryPrefix.findFirst({ where: { categoryId, label: p.label } });
        if (existing) await tx.categoryPrefix.update({ where: { id: existing.id }, data: { color: p.color ?? null, sortOrder: p.sortOrder ?? 0 } });
        else await tx.categoryPrefix.create({ data: { categoryId, label: p.label, color: p.color ?? null, sortOrder: p.sortOrder ?? 0 } });
        summary.categoryPrefixes++;
      }

      // 4) Thẻ (tag) — upsert theo slug
      for (const t of data.tags ?? []) {
        if (!t?.slug || !t?.name) continue;
        await tx.tag.upsert({
          where: { slug: t.slug },
          update: { name: t.name, color: t.color ?? null },
          create: { slug: t.slug, name: t.name, color: t.color ?? null },
        });
        summary.tags++;
      }

      // 5) Nhóm quyền — upsert theo key
      const keyToGroupId = new Map<string, string>();
      for (const g of data.permissionGroups ?? []) {
        if (!g?.key || !g?.name) continue;
        const row = await tx.userGroup.upsert({
          where: { key: g.key },
          update: {
            name: g.name, color: g.color ?? null, badgeIcon: g.badgeIcon ?? null, priority: g.priority ?? 0,
            permissions: g.permissions ?? [], autoPromote: !!g.autoPromote, minPosts: g.minPosts ?? 0,
            minReputation: g.minReputation ?? 0, minDays: g.minDays ?? 0,
          },
          create: {
            key: g.key, name: g.name, color: g.color ?? null, badgeIcon: g.badgeIcon ?? null, priority: g.priority ?? 0,
            isSystem: !!g.isSystem, permissions: g.permissions ?? [], autoPromote: !!g.autoPromote, minPosts: g.minPosts ?? 0,
            minReputation: g.minReputation ?? 0, minDays: g.minDays ?? 0,
          },
        });
        keyToGroupId.set(g.key, row.id);
        summary.permissionGroups++;
      }

      // 6) Ghi đè quyền theo danh mục — cần cả categorySlug và groupKey đã resolve được
      for (const p of data.categoryPermissions ?? []) {
        const categoryId = slugToId.get(p.categorySlug);
        const groupId = keyToGroupId.get(p.groupKey) ?? (await tx.userGroup.findUnique({ where: { key: p.groupKey }, select: { id: true } }))?.id;
        if (!categoryId || !groupId || !p.permission || !p.value) continue;
        await tx.categoryPermission.upsert({
          where: { categoryId_groupId_permission: { categoryId, groupId, permission: p.permission } },
          update: { value: p.value },
          create: { categoryId, groupId, permission: p.permission, value: p.value },
        });
        summary.categoryPermissions++;
      }

      await tx.auditLog.create({
        data: { actorId, action: 'backup.import', targetType: 'system', targetId: 'backup', after: summary },
      });
    });

    return { ok: true, summary };
  }
}
