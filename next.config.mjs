/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ảnh game do quản trị dán vào bằng địa chỉ ngoài, nên không khoá tên miền.
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};
export default nextConfig;
