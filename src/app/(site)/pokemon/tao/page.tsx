import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TaoNhanVat } from '@/components/pokemon/TaoNhanVat';

export const metadata: Metadata = { title: 'Tạo nhân vật — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangTao() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) {
    return (
      <div className="mx-auto max-w-lg">
        <p className="dao-tam p-5 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/pokemon" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để bắt đầu hành trình.
        </p>
      </div>
    );
  }
  // Đã có nhân vật thì không cho vào đây tạo con thứ hai.
  if (await db.pokeNhanVat.findUnique({ where: { userId }, select: { id: true } })) redirect('/pokemon');

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-black">Đặt chân lên đảo</h1>
      <p className="mb-4 text-sm text-ink-500">
        Đặt tên cho mình rồi chọn con thú đi cùng. Chọn xong là theo suốt chặng đầu,
        nên ngắm cho kỹ.
      </p>
      <section className="dao-tam p-5">
        <TaoNhanVat />
      </section>
    </div>
  );
}
