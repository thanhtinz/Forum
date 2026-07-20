import type { NextAuthConfig } from 'next-auth';

// Cấu hình edge-safe: KHÔNG import Prisma / bcrypt / adapter.
// Dùng chung cho middleware (Edge runtime) và cho instance đầy đủ ở auth.ts.
// Providers thật + adapter được thêm ở auth.ts (Node runtime).
export const authConfig = {
  pages: { signIn: '/login' },
  // Credentials provider bắt buộc dùng JWT session.
  session: { strategy: 'jwt' as const },
  providers: [],
  callbacks: {
    // Chạy ở cả Node lẫn Edge → chỉ thao tác trên token, không chạm DB.
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        // role được authorize() trả về hoặc gán lúc đăng nhập.
        const role = (user as { role?: string }).role;
        if (role) (token as { role?: string }).role = role;
      }
      return token;
    },
    // Bản session gọn cho middleware (Edge): lấy id + role từ token, không chạm DB.
    // auth.ts override callback này bằng bản đầy đủ (nạp thêm points/balance…).
    async session({ session, token }) {
      const t = token as { uid?: string; role?: string };
      if (session.user) {
        if (t.uid) session.user.id = t.uid;
        if (t.role) {
          (session.user as { role?: string }).role = t.role;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
