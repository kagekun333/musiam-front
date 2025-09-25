// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* 将来 .ico を置くなら下も OK */}
        <link rel="alternate icon" href="/favicon.ico" />
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  );
}
