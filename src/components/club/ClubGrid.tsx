import Link from 'next/link';
import { Users, MessageSquare, Lock } from 'lucide-react';
import { fmtCount } from '@/lib/utils';
import { UserName } from '@/components/user/Cosmetic';
import type { ClubCard } from '@/lib/club';

/** Ảnh đại diện câu lạc bộ; chưa đặt thì lấy chữ cái đầu của tên. */
function ClubAvatar({ club }: { club: ClubCard }) {
  return club.avatar
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={club.avatar} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
    : (
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-lg font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">
        {club.name.charAt(0).toUpperCase()}
      </span>
    );
}

export function ClubGrid({ clubs }: { clubs: ClubCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {clubs.map((c) => (
        <Link key={c.id} href={`/clb/${c.slug}`}
          className="card flex gap-3 p-3.5 transition-shadow hover:shadow-card-hover">
          <ClubAvatar club={c} />
          <div className="min-w-0 flex-1">
            {/* `truncate` phải nằm trên chính thẻ chứa CHỮ: đặt lên khối flex
                thì tên vẫn tràn ra ngoài thẻ, vì flex không cắt con của nó. */}
            <p className="flex items-center gap-1.5 font-bold text-ink-800 dark:text-ink-100">
              <span className="truncate">{c.name}</span>
              {c.privacy === 'MEMBERS' && <Lock size={13} className="shrink-0 text-ink-400" />}
            </p>
            {c.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{c.description}</p>}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              <span className="flex items-center gap-1"><Users size={12} /> {fmtCount(c.memberCount)}</span>
              <span className="flex items-center gap-1"><MessageSquare size={12} /> {fmtCount(c.postCount)}</span>
              {c.owner && (
                <span className="truncate">
                  Chủ: <UserName username={c.owner.username} name={c.owner.name} role={c.owner.role}
                    level={c.owner.level} cosmetics={c.owner.cosmetics} asLink={false} className="font-medium" />
                </span>
              )}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
