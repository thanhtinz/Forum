'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { assertSuperAdmin } from '@/lib/admin';
import {
  isCssColor, isShopKind, isTitleText, safeImageUrl,
  SHOP_NAME_MAX, SHOP_DESC_MAX, SHOP_PRICE_MAX, TITLE_MAX, KIND_LABELS,
} from '@/lib/shop-const';

export interface ShopAdminState { ok?: boolean; error?: string }

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

function refresh() {
  revalidatePath('/admin/shop');
  revalidatePath('/cua-hang');
  revalidatePath('/user/items');
}

/** Tạo hoặc sửa một món trong cửa hàng. */
export async function saveShopItem(_prev: ShopAdminState, formData: FormData): Promise<ShopAdminState> {
  // Cửa hàng là hàng của nền tảng: chỉ quản trị viên, không cho điều hành viên.
  await assertSuperAdmin();

  const kindRaw = String(formData.get('kind') ?? '');
  if (!isShopKind(kindRaw)) return { error: 'Loại đồ không hợp lệ.' };

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 1) return { error: 'Đặt tên cho món đồ đã.' };
  if (name.length > SHOP_NAME_MAX) return { error: `Tên tối đa ${SHOP_NAME_MAX} ký tự.` };

  const description = String(formData.get('description') ?? '').trim();
  if (description.length > SHOP_DESC_MAX) return { error: `Mô tả tối đa ${SHOP_DESC_MAX} ký tự.` };

  const price = Number(formData.get('pricePoints') ?? 0);
  if (!Number.isInteger(price) || price < 0 || price > SHOP_PRICE_MAX) {
    return { error: `Giá phải là số nguyên từ 0 đến ${SHOP_PRICE_MAX}.` };
  }

  // Giá trị kiểm theo đúng loại: màu thì phải là màu CSS, khung và huy hiệu
  // thì phải là đường dẫn ảnh dùng được.
  const rawValue = String(formData.get('value') ?? '').trim();
  let value: string;
  if (kindRaw === 'TITLE') {
    if (!isTitleText(rawValue)) {
      return { error: `Chữ danh hiệu phải có nội dung, tối đa ${TITLE_MAX} ký tự và nằm trên một dòng.` };
    }
    value = rawValue.trim();
  } else if (kindRaw === 'NAME_COLOR') {
    if (!isCssColor(rawValue)) {
      return { error: 'Giá trị màu không dùng được. Ví dụ: #e11d48, rgb(225 29 72), linear-gradient(90deg,#f43f5e,#f59e0b).' };
    }
    value = rawValue;
  } else {
    const url = safeImageUrl(rawValue);
    if (!url) return { error: `Chưa chọn ${KIND_LABELS[kindRaw].valueLabel.toLowerCase()}, hoặc đường dẫn ảnh không dùng được.` };
    value = url;
  }

  const order = Number(formData.get('order') ?? 0);
  const active = formData.get('active') !== null;
  const id = String(formData.get('id') ?? '').trim();

  const data = {
    kind: kindRaw, name, description: description || null, value,
    pricePoints: price, order: Number.isInteger(order) ? order : 0, active,
  };

  try {
    if (id) {
      await db.shopItem.update({ where: { id }, data, select: { id: true } });
    } else {
      const base = slugify(name) || 'mon-do';
      await db.shopItem.create({ data: { ...data, slug: `${base}-${Date.now().toString(36)}` }, select: { id: true } });
    }
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return { error: 'Trùng slug, đổi tên khác giúp mình.' };
    }
    throw e;
  }

  refresh();
  return { ok: true };
}

/**
 * Xoá một món.
 *
 * Xoá kéo theo cả lượt mua của người dùng, nên chỉ cho xoá món CHƯA AI MUA.
 * Món đã có người mua thì tắt `active` để gỡ khỏi quầy — người đã mua vẫn đeo
 * được món họ đã trả điểm.
 */
export async function deleteShopItem(id: string): Promise<ShopAdminState> {
  await assertSuperAdmin();

  const bought = await db.shopPurchase.count({ where: { itemId: id } });
  if (bought > 0) {
    return { error: `Đã có ${bought} người mua món này — hãy tắt "đang bán" thay vì xoá.` };
  }

  await db.shopItem.delete({ where: { id } });
  refresh();
  return { ok: true };
}
