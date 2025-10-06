/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      // 必要に応じて外部画像ドメインを追加
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'is1-ssl.mzstatic.com' },
      { protocol: 'https', hostname: 'is2-ssl.mzstatic.com' },
      { protocol: 'https', hostname: 'is3-ssl.mzstatic.com' },
      { protocol: 'https', hostname: 'is4-ssl.mzstatic.com' },
      { protocol: 'https', hostname: 'is5-ssl.mzstatic.com' },
    ],
  },
  // 本番ビルドを lint で止めない保険（すでに設定済みならそのまま）
  eslint: { ignoreDuringBuilds: true },
  // （任意）型エラーで止めたくない場合のみ
  // typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
