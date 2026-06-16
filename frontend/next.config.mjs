/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Xuất static để NestJS serve chung (deploy 1 process: API + frontend cùng origin)
  output: 'export',
  images: { unoptimized: true },
  // Dev: proxy /api -> backend; production unified thì NestJS phục vụ /api cùng origin
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
};
export default nextConfig;
