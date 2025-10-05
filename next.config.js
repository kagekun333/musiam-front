/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/oracle', destination: '/omikuji', permanent: false },
      { source: '/oracle/:path*', destination: '/omikuji', permanent: false },
    ];
  },
};
module.exports = nextConfig;