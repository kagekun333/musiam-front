/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Components and API routes read the catalog with fs at runtime.
  // Vercel serves public assets from the CDN, so the JSON must also be traced
  // into every server function that can call the shared loaders.
  outputFileTracingIncludes: {
    '/*': ['./public/works/*.json'],
    // Pages Router API functions are traced separately on Vercel. Without the
    // explicit route key, chat can build successfully but lose its catalog at
    // runtime and invent a title in plain text instead of returning a card.
    '/api/chat-experience-v3': ['./public/works/works.json', './public/works/works-ssd.json'],
    '/api/chat-reco-v2': ['./public/works/works.json', './public/works/works-ssd.json'],
  },
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
