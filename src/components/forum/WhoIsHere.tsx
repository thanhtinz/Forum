import Link from 'next/link';
import { Eye } from 'lucide-react';
import { getHere } from '@/lib/shout';
import { UserName } from '@/components/user/Cosmetic';

/**
 * "Đang xem chủ đề này: A, B, C".
 *
 * Dòng quen thuộc dưới mỗi chủ đề của forum ngày xưa. Chỉ đếm được thành viên
 * đã đăng nhập — khách vãng lai không có danh tính để mà kể tên, nên ở đây
 * không bịa ra con số khách như một số forum cũ vẫn làm.
 */
export async function WhoIsHere({ scope }: { scope: string }) {
  const people = await getHere(scope);
  if (people.length === 0) return null;

  return (
    <p className="retro-sub card mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3 py-2 text-ink-400">
      <Eye size={13} className="shrink-0" />
      <span className="font-semibold uppercase tracking-wide">Đang xem chủ đề này:</span>
      {people.map((u, i) => (
        <span key={u.username ?? i}>
          <UserName username={u.username} name={u.name} role={u.role}
            level={u.level} cosmetics={u.cosmetics} />
          {i < people.length - 1 && <span>,</span>}
        </span>
      ))}
    </p>
  );
}
