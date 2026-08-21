import { db } from './db';

/**
 * Ai được điều hành một diễn đàn: ADMIN/MODERATOR toàn site,
 * hoặc người được gán làm điều hành viên của chính diễn đàn đó.
 */
export async function canModerateForum(
  user: { id: string; role?: string | null } | null | undefined,
  forumId: string,
): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') return true;
  const mod = await db.forumModerator.findUnique({
    where: { forumId_userId: { forumId, userId: user.id } },
    select: { id: true },
  });
  return !!mod;
}
