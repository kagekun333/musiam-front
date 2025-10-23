// src/lib/env.ts
export const env = {
  siteUrl:
    process.env.STG_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "",

  crossmint: {
    env:
      process.env.STG_CROSSMINT_ENV ??
      process.env.CROSSMINT_ENV ??
      "staging",

    apiKey:
      process.env.STG_CROSSMINT_API_KEY ??
      process.env.CROSSMINT_API_KEY ??
      "",

    collectionId:
      process.env.STG_CROSSMINT_COLLECTION_ID ??
      process.env.CROSSMINT_COLLECTION_ID ??
      "",

    // 埋め込みを使う時だけ必要（public可）
    clientKey: process.env.NEXT_PUBLIC_CLIENT_API_KEY ?? "",
  },
};
