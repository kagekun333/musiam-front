export function buildDailyMusicSocialCopy({ platform, title, genre }) {
  const genreLine = genre ? `音の入口は${genre}。` : "先に意味を決めず、音だけを置きます。";
  const copyByPlatform = {
    instagram: `今日の一曲「${title}」。\n${genreLine}\n\n聴き終わった瞬間、どんな色が残りましたか？\nその一語を伯爵Chatへ。正解も購入も必要ありません。`,
    threads: `「${title}」を15秒。\n${genreLine}\n\n説明より先に、いま残った一語だけ教えてください。\n伯爵Chatで、その言葉から作品を一緒に読みます。`,
    tiktok: `この15秒、あなたには何色に聴こえる？\n「${title}」｜${genre || "ABI伯爵"}\n\n浮かんだ一語を伯爵Chatへ。意味はあなたの感覚から始めます。`,
    youtube: `イヤホン推奨。15秒後に残るものは？\n今日の一曲「${title}」。${genreLine}\n\n感情でも、景色でも、一語で大丈夫。伯爵Chatで続きを聞かせてください。`,
  };
  if (!copyByPlatform[platform]) throw new Error(`unsupported daily music platform: ${platform}`);
  return copyByPlatform[platform];
}
