// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ビルド時に ESLint を無視（当面）
  eslint: { ignoreDuringBuilds: true },
  // 必要なら他の設定もここに
};

export default nextConfig;
