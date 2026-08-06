export type InterestBridgeId = "rest" | "focus" | "memory" | "journey" | "transition" | "wonder" | "boredom";

export type InterestBridge = {
  id: InterestBridgeId;
  action: "explore" | "offer" | "decline";
  text: string;
};

type Signal = {
  id: InterestBridgeId;
  pattern: RegExp;
  jaObservation: string;
  enObservation: string;
  jaQuestion: string;
  enQuestion: string;
};

const SIGNALS: Signal[] = [
  { id: "rest", pattern: /(疲れ|眠れ|寝つけ|休みたい|落ち着きたい|しんどい|tired|cannot sleep|can't sleep|rest|unwind)/i, jaObservation: "少し力を抜ける余白が必要な夜に見えます", enObservation: "It sounds like an hour that needs a little room to breathe", jaQuestion: "今ほしいのは、静けさと温かさならどちらに近いですか？", enQuestion: "Which feels closer right now: quiet or warmth?" },
  { id: "focus", pattern: /(仕事.*考|頭から離れ|集中|作業|忙し|締切|考えすぎ|work.*mind|focus|busy|deadline|overthink)/i, jaObservation: "頭の中が仕事の速度のままなのですね", enObservation: "It sounds as though your mind is still moving at work speed", jaQuestion: "いまは鎮めたいですか、それとも流れを整えたいですか？", enQuestion: "Would you rather quiet it, or give it a steadier flow?" },
  { id: "memory", pattern: /(懐かし|昔|故郷|思い出|帰りたい|nostal|memory|hometown|miss.*home)/i, jaObservation: "その記憶は、説明するより空気ごと思い出したいものに聞こえます", enObservation: "That memory sounds like something to revisit as an atmosphere rather than explain", jaQuestion: "そこにあるのは、懐かしさと切なさならどちらが強いですか？", enQuestion: "Is the stronger feeling nostalgia or longing?" },
  { id: "journey", pattern: /(旅|出かけ|海|山|列車|飛行機|知らない場所|travel|journey|trip|sea|mountain|train)/i, jaObservation: "まだ動いていない旅の気配があります", enObservation: "There is already the beginning of a journey in that thought", jaQuestion: "惹かれるのは、遠くへ抜ける開放感と未知への高揚ならどちらですか？", enQuestion: "Are you drawn more to open distance or the thrill of the unknown?" },
  { id: "transition", pattern: /(変わりたい|始めたい|やり直|区切り|転機|決めたい|change|begin again|restart|turning point)/i, jaObservation: "次へ移る前の、静かな点火が必要なのかもしれません", enObservation: "This may be the quiet ignition before a change", jaQuestion: "背中を押してほしいですか、それとも一度気持ちを整えたいですか？", enQuestion: "Would you rather feel a push forward, or first gather yourself?" },
  { id: "wonder", pattern: /(宇宙|哲学|不思議|神秘|夢|意味|cosmos|space|philosophy|mystery|dream|meaning)/i, jaObservation: "答えを急がずに眺めていたくなる話です", enObservation: "This feels like a thought worth sitting with rather than solving quickly", jaQuestion: "惹かれるのは、深い静けさと未知の広がりならどちらですか？", enQuestion: "Which draws you more: deep stillness or the expanse of the unknown?" },
  { id: "boredom", pattern: /(退屈|暇|何か面白|刺激|つまらない|bored|boring|something interesting)/i, jaObservation: "いつもの景色を少しずらしたい気分なのですね", enObservation: "It sounds like you want the familiar view shifted a little", jaQuestion: "今ほしいのは、驚きと没入感ならどちらですか？", enQuestion: "Which would you rather have right now: surprise or immersion?" },
];

const EXPERIENCE_HOOKS: Record<InterestBridgeId, { ja: string; en: string }> = {
  rest: { ja: "三分だけ、頭を休ませる音の景色", en: "a three-minute soundscape to let the mind rest" },
  focus: { ja: "思考の速度を一段落とす一曲", en: "one track that lowers the speed of thought" },
  memory: { ja: "記憶を説明せずに開く音か景色", en: "a sound or image that opens memory without explaining it" },
  journey: { ja: "まだ行っていない場所の空気を持つ一作", en: "a work carrying the air of somewhere not yet visited" },
  transition: { ja: "次へ進む前の静かな点火になる一作", en: "a quiet ignition before the next step" },
  wonder: { ja: "答えを決めず、余韻だけ残す一作", en: "a work that leaves an echo without fixing an answer" },
  boredom: { ja: "いつもの景色を少しだけずらす一作", en: "a work that shifts the familiar view slightly" },
};

const INVITATION_MARKER = /(無料で見られる一作|無料で見られます|作品をひとつだけ|見てみますか|one work you can experience free|free to experience|single work)/i;
const EXPLORATION_MARKER = /(どちらに近いですか|どちらが強いですか|どちらですか|鎮めたいですか|背中を押してほしいですか|which feels closer|would you rather|which draws you more)/i;
const DECLINE = /(いらない|不要|興味ない|やめて|結構です|作品.*(?:なし|要ら)|売り込|no thanks|not interested|do not recommend|don't recommend|stop selling)/i;
const BLOCK = /(購入|買う|価格|予算|メタルプリント|限定版|dossier|whitewall|真正性|仕事依頼|商用|オーダー|purchase|buy|price|budget|metal print|limited edition|commercial|commission)/i;

export function isChatInterestInvitation(text: string): boolean {
  return INVITATION_MARKER.test(text);
}

export function isChatInterestDecline(text: string): boolean {
  return DECLINE.test(text);
}

export function chatInterestRecommendationSeed(text: string, lang: string): string | null {
  const entry = (Object.entries(EXPERIENCE_HOOKS) as [InterestBridgeId, { ja: string; en: string }][])
    .find(([, hook]) => text.includes(hook.ja) || text.includes(hook.en));
  if (!entry) return null;
  const seeds: Record<InterestBridgeId, { ja: string; en: string }> = {
    rest: { ja: "眠る前に聴く静かで落ち着く音楽", en: "quiet calming music before sleep" },
    focus: { ja: "集中を邪魔せず思考を整える音楽", en: "unobtrusive music for calm focus" },
    memory: { ja: "故郷や記憶に触れる懐かしい音楽", en: "nostalgic music evoking memory and home" },
    journey: { ja: "旅の景色と開放感を運ぶ音楽", en: "music carrying travel and open horizons" },
    transition: { ja: "静かな希望と再出発を感じる音楽", en: "music for quiet hope and a new beginning" },
    wonder: { ja: "宇宙の静けさと神秘を感じる音楽", en: "music evoking cosmic stillness and mystery" },
    boredom: { ja: "景色を変える意外性のある刺激的な作品", en: "a surprising work that shifts the familiar view" },
  };
  return lang === "ja" ? seeds[entry[0]].ja : seeds[entry[0]].en;
}

export function buildChatInterestBridge(input: {
  conversation: string;
  latest: string;
  previousAssistant: string;
  userTurns: number;
  lang: string;
}): InterestBridge | null {
  const { conversation, latest, previousAssistant, userTurns, lang } = input;
  if (INVITATION_MARKER.test(previousAssistant) && DECLINE.test(latest)) {
    return {
      id: "boredom",
      action: "decline",
      text: lang === "ja"
        ? "承知しました。作品の話はこちらから重ねません。今はそのまま、話したいことの続きを聞かせてください。"
        : "Understood. I will not bring up a work again. We can simply continue with whatever you wanted to talk about.",
    };
  }
  if (userTurns < 2 || BLOCK.test(conversation) || DECLINE.test(latest) || INVITATION_MARKER.test(previousAssistant)) return null;
  const signal = SIGNALS.find((candidate) => candidate.pattern.test(conversation));
  if (!signal) return null;
  if (!EXPLORATION_MARKER.test(previousAssistant)) {
    return {
      id: signal.id,
      action: "explore",
      text: lang === "ja"
        ? `${signal.jaObservation}。${signal.jaQuestion}`
        : `${signal.enObservation}. ${signal.enQuestion}`,
    };
  }
  const hook = EXPERIENCE_HOOKS[signal.id];
  return {
    id: signal.id,
    action: "offer",
    text: lang === "ja"
      ? `${signal.jaObservation}。もしよければ、${hook.ja}を一つ選べます。無料で見られますし、合わなければそのまま雑談に戻りましょう。見てみますか？`
      : `${signal.enObservation}. If you like, I can choose ${hook.en}. It is free to experience, and if it misses we simply return to the conversation. Shall I?`,
  };
}
