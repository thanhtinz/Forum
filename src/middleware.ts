import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

// Instance chỉ dùng cấu hình edge-safe → middleware không kéo Prisma/bcrypt vào Edge runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (pathname.startsWith('/user') && !user) {
    const url = new URL('/login', req.nextUrl);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/admin')) {
    const role = (user as { role?: string } | undefined)?.role;
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/user/:path*', '/admin/:path*'],
};
