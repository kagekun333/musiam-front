#!/usr/bin/env node
// scripts/refine-works-ssd.mjs
//
// 目的:
// - works-ssd.json のうち、既存作品の最新版タイトルとして扱う 9 件に canonicalMasterId を付与
// - notes が空の 17 件に、展示・推薦で使える最小限の mood / notes / summary を補完
//
// 注意:
// - works.json は一切触らない
// - works-ssd.json の sidecar 方針を守り、追記的に整える

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const WORKS_SSD_PATH = path.join(ROOT, "public/works/works-ssd.json");

const CANONICAL_OVERRIDES = {
  "アメノミナカヌシ": {
    canonicalMasterId: "ameno-minakanushi-223",
    canonicalMasterTitle: "AMENO MINAKANUSHI",
  },
  "カーボンネガティブプロジェクト": {
    canonicalMasterId: "spotify-single-67DToKxvWonpGDlwwtVhyJ",
    canonicalMasterTitle: "Carbon Negative Project",
  },
  "ルーツ・オブ・トゥルース": {
    canonicalMasterId: "spotify-album-6acsBbFbxxCTKQpSdlkxpx",
    canonicalMasterTitle: "ROOTS OF TRUTH",
  },
  "IMAGINE NO BUTTON": {
    canonicalMasterId: "spotify-single-2Xb6klIRauA4zxhrddldUn",
    canonicalMasterTitle: "IMAGINE：NO BUTTON",
  },
  "サウナトランス ととのい": {
    canonicalMasterId: "spotify-single-5JYgZgm324NPTCkiAyFjbb",
    canonicalMasterTitle: "SAUNA TRANCE：TOTONOI",
  },
  "ピース・イズ・エンジニアード": {
    canonicalMasterId: "spotify-single-2PB3rZMx4luyCZUAaRtLMq",
    canonicalMasterTitle: "Peace Is Engineered",
  },
  "WORLD STRIKE Thirteen Tongues": {
    canonicalMasterId: "spotify-single-18L8cZMCoYylC09TiZAi0z",
    canonicalMasterTitle: "WORLD STRIKE — Thirteen Tongues",
  },
  "사인 주세요": {
    canonicalMasterId: "spotify-single-43CyheqfBIFgDSRmB4ZfAt",
    canonicalMasterTitle: "사인 주세요 Sign Juseyo",
  },
  "ウィーアーザアース": {
    canonicalMasterId: "spotify-single-0o5od07Lyxu9w9obQuvgm9",
    canonicalMasterTitle: "We are the Earth",
  },
};

const MISSING_NOTE_OVERRIDES = {
  "AOTEAROA HEARTBEAT": {
    moodTags: ["aotearoa", "heartbeat", "uplifting", "ceremonial"],
    mood: "aotearoa / heartbeat / uplifting / ceremonial",
    notes:
      "アオテアロアの風景と鼓動をまっすぐ結ぶ祝祭的シングル。海と山のあいだで鳴る太鼓の脈をそのまま胸に移し替えるような一曲で、旅の高揚と共同体の温度を同時に運ぶ。静かな祈りと足取りの強さが共存する、朝焼けの国土のアンセム。",
  },
  "EARTH DAY": {
    moodTags: ["earth day", "hopeful", "ecological", "choral"],
    mood: "earth day / hopeful / ecological / choral",
    notes:
      "地球の日をまっすぐ言祝ぐクリーンなアンセム。大地を労わる視線と、まだ間に合うという希望をシンプルな言葉で束ね、学校や広場で合唱できるような開けた明るさを持つ。環境意識を説教ではなく呼吸の揃った歌として差し出す一曲。",
  },
  "Kia Ora": {
    moodTags: ["greeting", "warm", "open-hearted", "gentle"],
    mood: "greeting / warm / open-hearted / gentle",
    notes:
      "「ようこそ」と「元気でいて」を同時に差し出す、やわらかな挨拶の歌。言葉そのものの温度を大切にしながら、初対面の距離がふっと縮まる瞬間を音にしている。肩の力を抜き、微笑みから一日を始めたくなる小さな祝福。",
  },
  "MAORI TRIBE": {
    moodTags: ["tribal", "proud", "ancestral", "rhythmic"],
    mood: "tribal / proud / ancestral / rhythmic",
    notes:
      "祖先の声と現代のビートを結び直すトライバル・チャンツ。土を踏む足の重み、共同体の誇り、受け継がれる名の力が短いフレーズの中に凝縮されている。勇壮さだけでなく、守り継ぐ者の静かな品格も感じさせる一曲。",
  },
  "Mauri": {
    moodTags: ["life force", "sacred", "stillness", "healing"],
    mood: "life force / sacred / stillness / healing",
    notes:
      "生命の芯にそっと触れるようなスピリチュアル・ピース。激しく主張せず、呼吸の奥にある火種を見つめるように進み、聴き手の内側に静かな強さを残す。祈りと回復のあいだに置かれた、透明度の高い小さな聖歌。",
  },
  "Policy vs Plant": {
    moodTags: ["satirical", "political", "dry wit", "activist"],
    mood: "satirical / political / dry wit / activist",
    notes:
      "制度と植物のねじれた関係を、乾いたユーモアで切り取る社会風刺曲。堅い言葉で組まれた政策の輪郭と、ただ伸びようとする生命の単純さを対比させ、理屈の硬直を軽やかに揺さぶる。怒鳴らずに効く批評として機能する一曲。",
  },
  Rotorua: {
    moodTags: ["geothermal", "travel", "misty", "expansive"],
    mood: "geothermal / travel / misty / expansive",
    notes:
      "湯気と硫黄の気配が立ちのぼる土地の体感をそのまま封じ込めたトラベル・トラック。熱を孕んだ地面、白い蒸気、観光地の華やかさよりも場所そのものが持つ呼吸に耳を澄ませている。異国の温泉地を歩くような、湿度ある空気感が魅力。",
  },
  TANGAROA: {
    moodTags: ["ocean", "mythic", "tidal", "ceremonial"],
    mood: "ocean / mythic / tidal / ceremonial",
    notes:
      "海そのものに名を与えるような神話的オーシャン・ソング。潮の満ち引きの重みと、水平線の向こうから迫る大きな存在感をゆったりした歩幅で描く。儀式性を帯びながらも開放感があり、深海ではなく大海原の広さを感じさせる一曲。",
  },
  "TU — TE TOA AKE": {
    moodTags: ["warrior", "rise", "discipline", "anthemic"],
    mood: "warrior / rise / discipline / anthemic",
    notes:
      "立ち上がる者の背筋をまっすぐ伸ばす、武人のアンセム。激昂ではなく鍛えられた集中力を前に出し、一歩ごとの重さで意志の強さを伝える。勝利の高揚よりも、恐れを越えて前進する姿勢に焦点を当てた一曲。",
  },
  "WAIATA RISE": {
    moodTags: ["choral", "uplift", "community", "radiant"],
    mood: "choral / uplift / community / radiant",
    notes:
      "歌そのものが上昇していく感覚をまっすぐ描いたコーラル・ポップ。ひとりで聴いても良いが、複数の声が重なった時に本領を発揮するタイプで、場の空気を少しずつ持ち上げていく。共同体の光量を増やすための明るい上昇曲。",
  },
  "WHAKATAU THE FIRE": {
    moodTags: ["ignition", "ritual fire", "fervent", "collective"],
    mood: "ignition / ritual fire / fervent / collective",
    notes:
      "火を囲む儀式の瞬間を切り取ったような高熱の一曲。煽情的に暴れるのではなく、火種が群れに移っていく感覚を一定のテンポで積み上げ、熱の連鎖を生む。祭り前夜の緊張と決起が同居した、火入れのための音楽。",
  },
  "Wu Wei Ziran": {
    moodTags: ["tao", "effortless", "still", "contemplative"],
    mood: "tao / effortless / still / contemplative",
    notes:
      "無為自然の感覚をそのまま音に写した、静謐なコンテンプレイティブ・トラック。何かを達成する方向には進まず、流れに逆らわない姿勢そのものを美徳として差し出す。余白が主役で、聴き終わった後に心拍だけがきれいに残るタイプの曲。",
  },
  キャンペーン: {
    moodTags: ["campaign", "satire", "restless", "urban"],
    mood: "campaign / satire / restless / urban",
    notes:
      "告知と扇動の境界線を遊ぶ、都市的なアイロニーを帯びた一曲。軽い言葉が連打されるほど裏側の焦燥がにじみ出る構造で、勢いの良さと空虚さを同時に見せる。宣伝の熱量そのものを素材化した、少しねじれたポップ。",
  },
  "光の迷路": {
    moodTags: ["luminous", "maze", "dreamlike", "cinematic"],
    mood: "luminous / maze / dreamlike / cinematic",
    notes:
      "出口の見えない迷路を、恐怖ではなく光で描くシネマティック・ナンバー。反射する光、曲がり角ごとに変わる色温度、進むほどに景色が開けていく感覚が美しい。迷うこと自体を祝福へ変える、幻想的な歩行曲。",
  },
  "大麻解放の日": {
    moodTags: ["legalization", "activist", "celebratory", "provocative"],
    mood: "legalization / activist / celebratory / provocative",
    notes:
      "抑圧の解除を記念日へ変える、挑発と祝祭が同居した一曲。政治的な論点を正面から抱えながらも、空気は暗くならず、むしろ解放の瞬間の明るさに焦点を当てている。境界線が動いた日に鳴るファンファーレとして機能する。",
  },
  "深淵の聖堂": {
    moodTags: ["abyssal", "sacred", "dark ambient", "cathedral"],
    mood: "abyssal / sacred / dark ambient / cathedral",
    notes:
      "深海と聖堂を重ね合わせたようなダーク・アンビエント。音は少ないが残響は深く、遠くで灯る光に向かってゆっくり歩かされる。恐怖よりも畏怖が強く、沈黙の中で祈りの輪郭だけが浮かび上がる一曲。",
  },
  "蒼穹の戴冠": {
    moodTags: ["coronation", "sky", "majestic", "cinematic"],
    mood: "coronation / sky / majestic / cinematic",
    notes:
      "空そのものが王冠をかぶる瞬間を描いた、威厳あるシネマティック・ピース。雲間から差す光と高所の風を感じさせ、上へ開いていく視界の広さが印象に残る。勝利の曲というより、運命が静かに定まる場面のための音楽。",
  },
};

function asArray(json) {
  return Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
}

function uniq(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

async function main() {
  const raw = await fs.readFile(WORKS_SSD_PATH, "utf8");
  const json = JSON.parse(raw);
  const items = asArray(json);

  let canonicalTagged = 0;
  let notesFilled = 0;

  for (const item of items) {
    const canonical = CANONICAL_OVERRIDES[item.title];
    if (canonical) {
      item.canonicalMasterId = canonical.canonicalMasterId;
      item.canonicalMasterTitle = canonical.canonicalMasterTitle;
      item.tags = uniq([...(item.tags || []), "ssd-canonical"]);
      canonicalTagged++;
    }

    const fill = MISSING_NOTE_OVERRIDES[item.title];
    const topTrack = item?.ssd?.tracks?.[0];
    const needsNotes = topTrack && !String(topTrack.notes || "").trim();
    if (fill && needsNotes) {
      topTrack.mood = fill.mood;
      topTrack.notes = fill.notes;
      item.moodTags = fill.moodTags.slice();
      item.matchInfo = {
        ...(item.matchInfo || {}),
        summary: fill.notes.slice(0, 200),
        reason: "SSD release with inferred notes from title/release metadata",
      };
      item.tags = uniq([...(item.tags || []), "ssd-inferred-notes"]);
      notesFilled++;
    }
  }

  const out = {
    ...json,
    items,
    refinedAt: new Date().toISOString(),
  };

  await fs.writeFile(WORKS_SSD_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      {
        canonicalTagged,
        notesFilled,
        totalItems: items.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
