import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { authConfig } from './auth.config';

// Chỉ bật OAuth khi có credential — tránh lỗi lúc build/khi chưa cấu hình.
const providers: NextAuthConfig['providers'] = [
  Credentials({
    name: 'credentials',
    credentials: {
      identifier: { label: 'Email hoặc tên đăng nhập', type: 'text' },
      password: { label: 'Mật khẩu', type: 'password' },
    },
    async authorize(creds) {
      const identifier = String(creds?.identifier ?? '').trim().toLowerCase();
      const password = String(creds?.password ?? '');
      if (!identifier || !password) return null;

      const user = await db.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] },
      });
      if (!user?.passwordHash) return null;
      if (user.status === 'BANNED' || user.status === 'SUSPENDED') return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        name: user.name ?? user.username,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        const role = (user as { role?: string }).role;
        if (role) (token as { role?: string }).role = role;
      }
      return token;
    },
    // Override bản edge-safe: nạp đầy đủ thông tin từ DB (Node runtime).
    async session({ session, token }) {
      const uid = token.uid as string | undefined;
      if (uid && session.user) {
        const u = await db.user.findUnique({
          where: { id: uid },
          select: {
            id: true, username: true, role: true, points: true, balance: true,
            level: true, vipTier: true, vipExpiresAt: true, vipPermanent: true, image: true,
          },
        });
        if (u) {
          session.user.id = u.id;
          Object.assign(session.user, {
            username: u.username, role: u.role, points: u.points, balance: u.balance,
            level: u.level, vipTier: u.vipTier, vipExpiresAt: u.vipExpiresAt,
            vipPermanent: u.vipPermanent,
          });
        }
      }
      return session;
    },
  },
});
