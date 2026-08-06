export type MusicWorkAffinityAction = "explore" | "permission" | "dossier" | "decline";

export type MusicWorkAffinityTurn = {
  action: MusicWorkAffinityAction;
  text: string;
};

const DECLINE = /(いらない|興味ない|やめて|結構です|売り込|販売.*不要|no thanks|not interested|do not sell|stop selling)/i;
const ACCEPT = /(はい|うん|ぜひ|見たい|見てみたい|興味ある|進みたい|お願い|yes|sure|interested|show me|continue)/i;
const PERMISSION_MARKER = /(作品固有Dossierの準備相談|work-specific Dossier consultation)/i;

export function buildMusicWorkAffinityTurn(input: {
  workTitle: string;
  latest: string;
  previousAssistant: string;
  userTurns: number;
  lang: string;
}): MusicWorkAffinityTurn {
  const title = input.workTitle.trim().slice(0, 120);
  const ja = input.lang === "ja";
  if (DECLINE.test(input.latest)) {
    return {
      action: "decline",
      text: ja
        ? `承知しました。「${title}」を商品へ結びつける話はこちらから重ねません。この曲について感じたことだけ、よければそのまま聞かせてください。`
        : `Understood. I will not turn “${title}” into a sales conversation. We can simply stay with what the music meant to you.`,
    };
  }
  if (PERMISSION_MARKER.test(input.previousAssistant) && ACCEPT.test(input.latest)) {
    return {
      action: "dossier",
      text: ja
        ? `ありがとうございます。「${title}」をメタルプリント候補として検討する作品固有Dossierの準備相談へ進みます。現時点では販売確定や購入義務ではありません。下の相談欄で、残したい感情と飾る空間を教えてください。`
        : `Thank you. We can move into a work-specific Dossier consultation for “${title}” as a possible metal print. This is not a confirmed offer or a purchase obligation. Tell me which feeling and space you want to preserve.`,
    };
  }
  if (input.userTurns <= 1) {
    return {
      action: "explore",
      text: ja
        ? `「${title}」に来てくださったのですね。急いで商品へ結びつけず、まず聞かせてください。この曲のどの瞬間、音、言葉、ジャケットがいちばん心に残りましたか？`
        : `You came here through “${title}.” Before turning that into any product conversation, which moment, sound, word, or part of its artwork stayed with you most?`,
    };
  }
  return {
    action: "permission",
    text: ja
      ? `そこが残ったのですね。その感情を音だけで終わらせず、ジャケットの景色として部屋に残すことにも関心がありますか？ まだ販売確定や価格の話には進みません。まず「${title}」の作品固有Dossierの準備相談を見てみますか？`
      : `That is the part that stayed with you. Would you be interested in preserving that feeling in a room through the artwork as well as the sound? This is not yet a confirmed offer or price discussion. Would you like to see the work-specific Dossier consultation for “${title}”?`,
  };
}
