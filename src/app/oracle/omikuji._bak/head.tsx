// 最低限の静的ヘッド（App Router用）
export default function Head() {
  return (
    <>
      <title>伯爵御籤 | MUSIAM</title>
      <meta name="description" content="一枚引いて、今日の導きを。Recommended works will be suggested for your draw." />
      <meta property="og:title" content="伯爵御籤 | MUSIAM" />
      <meta property="og:description" content="一枚引いて、今日の導きを。" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/og/omikuji-default.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
