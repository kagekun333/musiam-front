export type MetalSalesStage =
  | "discover_space"
  | "discover_effect"
  | "discover_size"
  | "discover_region"
  | "discover_budget"
  | "discover_timing"
  | "discover_authority"
  | "discover_work"
  | "handle_price"
  | "handle_proof"
  | "handle_size"
  | "handle_delivery"
  | "handle_cancellation"
  | "handle_comparison"
  | "handle_evidence"
  | "handle_dossier_access"
  | "handle_dossier_link"
  | "nurture_budget"
  | "nurture_timing"
  | "nurture_authority"
  | "stop"
  | "close_to_dossier";

export type MetalSalesTurn = { stage: MetalSalesStage; text: string; readyForDossier: boolean };

const has = (value: string, pattern: RegExp) => pattern.test(value.normalize("NFKC"));

export function buildMetalPrintSalesTurn(conversation: string, lang: string): MetalSalesTurn {
  const text = conversation.normalize("NFKC");
  const userMarkers = [...text.matchAll(/(?:^|\n)user:\s*/gi)];
  const latest = userMarkers.length ? text.slice((userMarkers.at(-1)?.index ?? 0) + userMarkers.at(-1)![0].length) : text;
  const ja = lang === "ja";
  const reply = (stage: MetalSalesStage, jaText: string, enText: string, readyForDossier = false): MetalSalesTurn => ({
    stage,
    text: ja ? jaText : enText,
    readyForDossier,
  });

  if (has(latest, /(営業.*(?:止|不要|終了)|連絡.*(?:止|不要|終了)|これ以上.*質問|終了して|購入しません|買いません|購入.*(?:進みません|進まない|見送|拒否)|相談.*(?:進みません|進まない|不要|見送|拒否)|dossier(?:も|は)?(?:不要|いらない)|正式offer(?:も|は)?.*(?:不要|いらない)|do not contact|stop (?:selling|contacting)|not buying|no sales|will not (?:buy|proceed)|decline (?:the )?(?:purchase|consultation))/i)) {
    if (has(latest, /(証拠|proof|署名|真正性|certificate).*(揃|確認|でき|available|verified)|揃.*(?:再検討|考)|reconsider.*(?:evidence|proof)/i)) {
      return reply("stop", "承知しました。現時点では購入・非公開相談を勧めず、こちらから営業連絡も行いません。検証可能な証拠が公開された後、ご自身で再検討を望まれた時だけ再開できます。", "Understood. I will not recommend purchase or a private consultation now, and no sales follow-up will be made. You may reopen the conversation only if you choose to reconsider after verifiable evidence is published.");
    }
    return reply("stop", "承知しました。購入もDossierも勧めません。この会話から営業連絡を行うこともありません。", "Understood. I will not recommend a purchase or Dossier, and no sales follow-up will be made from this conversation.");
  }
  if (has(latest, /(dossier|ドシエ|ドシエー).*(?:閲覧|見る|個人情報|購入義務|条件)|個人情報.*(?:必要|不要)|purchase obligation|personal information/i)
      && !has(latest, /(url|リンク|直接)/i)) {
    return reply("handle_dossier_access", "公開Dossierの閲覧だけなら購入義務も個人情報入力もありません。非公開相談の送信には連絡用メールと同意が必要です。最終総額・サイズ・配送・取消条件は作品プリフライト後の正式Dossierで確認でき、未確定のまま決済は開きません。", "Viewing the public Dossier creates no purchase obligation and requires no personal information. Sending a private consultation requires a contact email and consent. Final total, size, delivery and cancellation terms are shown in the formal Dossier after preflight; checkout stays closed while they are unresolved.");
  }
  if (has(latest, /(dossier|ドシエ).*(?:url|リンク|直接)|(?:url|リンク).*(?:dossier|ドシエ)|直接.*(?:dossier|ドシエ)/i)) {
    return reply("handle_dossier_link", "選択作品の公開Dossierへ、下の作品別ボタンから直接進めます。閲覧だけなら個人情報入力も購入義務もありません。", "Use the work-specific button below to open the selected public Dossier directly. Viewing it requires no personal information and creates no purchase obligation.");
  }

  // Objections always take precedence over the qualification sequence.
  if (has(latest, /(高い|高すぎ|値段|価格.*(?:理由|なぜ)|33万.*(?:理由|払)|expensive|too much|why.*price)/i)) {
    return reply("handle_price", "33万円は画像データ代ではなく、60cm角の限定Edition、受注制作、作品別Dossierと配送確認までを含むCollector価格です。価値が合わなければ勧めません——一点に想定する上限は、15万円未満・15〜33万円・33万円以上のどれですか？", "¥330,000 is the collector price for a 60 cm limited edition, made-to-order production, a work-specific Dossier and delivery review—not a fee for an image file. If that value does not fit, I will not press it: is your ceiling under ¥150k, ¥150–330k, or ¥330k+?");
  }
  if (has(latest, /(whitewall|プリント業者|印刷会社).*(直接|直注|自分で|価格差|差額|違|比較|比べ)|直接注文.*(?:差|違|比較|比べ)/i)) {
    return reply("handle_comparison", "WhiteWallへの直注は、お客様が権利を持つ画像を印刷する製造サービスです。この33万円は印刷性能の上乗せではなく、ABI伯爵作品の正規Edition、各3点の販売上限、作品別Dossier、入稿・配送確認を含む管理価格です。ただし、現時点では実物proof・署名・真正性証明書が未確認なので、その差額を検証可能な品質差としては提示できません。そこを必須条件にするなら、証拠が揃うまで購入を保留してください。", "Ordering from WhiteWall directly is a manufacturing service for an image you have the right to print. This ¥330,000 price is not a markup for superior print performance; it covers an authorized ABI Count edition, a cap of three, the work-specific Dossier, and production and delivery handling. However, the physical proof, signature and certificate are not yet verified, so I cannot present the premium as a verifiable quality difference. If those are required, defer purchase until the evidence exists.");
  }
  if (has(latest, /(実物|サンプル|proof|色.*違|画面.*違|見てから|sample|see it first|color)/i)
      && !has(latest, /(署名|サイン|真正性|証明書|認定|実物写真|証拠URL|signature|certificate|authentic|certif|physical photo|evidence)/i)) {
    return reply("handle_proof", "もっともな懸念です。実物proofが未承認で、画面と完成品の色・光沢に差が出得ることを決済前に明示します。まずは設置予定の光が、自然光中心か照明中心かだけ教えてください。", "That is a valid concern. The physical proof is not yet approved, and screen color and final gloss can differ; we disclose that before payment. Is the intended wall lit mainly by daylight or artificial light?");
  }
  if (has(latest, /(大きすぎ|小さすぎ|サイズ.*(?:不安|迷|判断)|何センチ|実寸|壁幅.*60|90cm.*60|size|too big|too small|dimensions)/i)) {
    return reply("handle_size", "適合は断言しません。壁に60cm角の紙またはマスキングテープで実寸枠を作り、普段見る位置から24時間確認するのが最短です。壁幅90cmなら左右余白は各15cmなので、余白を重視する場合は60cmより小さい候補を正式Offer前に検討します。", "I will not claim it fits without verification. Mark a 60 cm square on the wall with paper or low-tack tape and view it from the normal position for 24 hours. On a 90 cm wall that leaves 15 cm on each side, so a smaller format should be reviewed before the formal Offer if breathing room matters.");
  }
  if (has(latest, /(送料|配送.*(?:どう|いくら|不安|可能|期間)|いつ届|納期|海外.*(?:送|配送)|関税|shipping|delivery.*(?:cost|time|possible|concern)|when.*arrive|customs|dut)/i)) {
    const knownRegion = has(text, /(日本|japan)/i);
    return knownRegion
      ? reply("handle_delivery", "配送先は日本として保持しています。製造目安は入金後約12営業日＋配送期間です。送料、発送元、税・関税の有無、配送破損時の再製作条件は正式Offer前に書面で確定し、未確定のまま決済へ進めません。", "The destination is retained as Japan. The production estimate is about 12 business days after payment plus transit. Shipping cost, origin, tax or duty treatment and replacement terms for transit damage are confirmed in writing before the formal Offer; checkout does not open while they remain unresolved.")
      : reply("handle_delivery", "入金確認後に受注制作し、通常は製造約12営業日＋配送期間です。送料・配送可否・関税可能性は正式Offer前に配送国ごとに確定します。配送先の国または地域はどちらですか？", "Production normally takes about 12 business days after payment, plus transit. Shipping availability, cost and possible duties are confirmed for the destination before the formal Offer. Which country or region will receive it?");
  }
  if (has(latest, /(返品|返金|キャンセル|取消|変更|return|refund|cancel|change.*order)/i)
      && !has(latest, /(dossier|ドシエ).*(?:閲覧|見る|個人情報|購入義務|条件)/i)) {
    return reply("handle_cancellation", "受注生産のため、製造開始後の変更・取消可否は進行状況で変わります。破損・製造不良は証拠確認後に再製作判断を行い、条件は決済前のDossierで明示します。購入時期は30日以内・90日以内・それ以降のどれに近いですか？", "Because each piece is made to order, changes or cancellation after production starts depend on production status. Damage or manufacturing defects are reviewed for replacement, and the terms are shown before payment. Is your timing within 30 days, within 90 days, or later?");
  }
  if (has(latest, /(どれ.*違|比較|比べ|直接注文.*差|迷って|二つ|2つ|compare|difference|between|which one)/i)
      && !has(latest, /(署名|サイン|真正性|証明書|認定|実物写真|証拠URL|signature|certificate|authentic|certif|physical photo|evidence)/i)) {
    return reply("handle_comparison", "印刷そのものがWhiteWall等の一般注文より優れているとは断言しません。価格差はABI伯爵の作品使用、各3点の販売上限、個別Dossierと受注管理に対するものです。実物proof・署名・真正性証明が未確認の現状で、その価値が33万円に合わなければ購入を勧めません。比較したい条件を一つ挙げるなら、作品性・限定性・実物品質のどれですか？", "I do not claim the printing itself is superior to a standard WhiteWall order. The premium is for the ABI Count work, the edition limit of three, the individual Dossier and managed production. With the physical proof, signature and certificate still unverified, I would not recommend buying unless that value fits. Which comparison matters most: authorship, scarcity, or physical quality?");
  }
  if (has(latest, /(署名|サイン|真正性|証明書|認定|実物写真|証拠URL|signature|certificate|authentic|certif|physical photo|evidence)/i)) {
    return reply("handle_evidence", "現時点で確認済みと言えるのは、ABI伯爵の作品であること、各3点の販売上限、60cm角ChromaLuxe候補、受注生産方針です。作者署名、真正性証明書、WhiteWallによる作品認定、承認済み実物写真は未確認で、提示できるとは申しません。これらが必要なら、揃うまで購入を保留してください。", "Currently verified are ABI Count authorship, the edition cap of three, the proposed 60 cm ChromaLuxe format and the made-to-order policy. An artist signature, certificate of authenticity, WhiteWall artwork certification and approved physical photographs are not verified, so I will not claim they can be provided. If you require them, please defer purchase until they exist.");
  }
  const space = has(text, /(自宅|部屋|書斎|別荘|オフィス|会社|応接|会議室|ホテル|店舗|スパ|サロン|壁|home|room|study|office|lobby|hotel|shop|spa|wall)/i);
  const effect = has(text, /(始まり|始動|決断|帰還|故郷|落ち着|静けさ|力強|儀式|宇宙|哲学|印象|雰囲気|ignition|begin|return|home|calm|ritual|cosmos|impression|mood)/i);
  const size = has(text, /(\d{2,4}\s*(?:cm|mm|センチ|ミリ|m\b)|壁幅|横幅|60cm|size|width)/i);
  const region = has(text, /(日本|東京|大阪|北海道|沖縄|米国|アメリカ|カナダ|英国|ドイツ|フランス|欧州|シンガポール|香港|japan|tokyo|usa|united states|canada|uk|germany|france|europe|singapore|hong kong)/i);
  const budget = has(text, /(33万|330,?000|15万|150,?000|予算|上限|万円|budget|¥|yen)/i);
  const timing = has(text, /(30日|1か月|一ヶ月|90日|3か月|三ヶ月|今月|来月|年内|時期|within 30|within 90|month|timing)/i);
  const authority = has(text, /(自分で.*決め|私が.*決め|決裁|稟議|社長|オーナー|家族と相談|決定者|i decide|decision maker|approval|owner)/i);
  const workSelected = has(text, /(deus sive natura|33 ignition|a town called almost home|balian|作品(?:は|を).*(?:選|候補)|候補.*作品)/i);

  if (has(text, /(15万円未満|上限.*15万未満|under ¥?150k|under 150)/i)) return reply("nurture_budget", "現在の正式Offerは33万円のため、ご予算とは合いません。値下げを装って追うことはせず、15万円未満の承認済み仕様ができるまで購入を勧めません。", "The current formal Offer is ¥330,000 and does not fit your budget. I will not manufacture urgency or pressure you; I will not recommend purchase unless an approved format under ¥150,000 exists.");
  if (has(text, /(90日より先|それ以降|later than 90|beyond 90)/i)) return reply("nurture_timing", "購入時期は90日より先として保持します。今は正式Offerへ急がず、条件が変わった時に改めて確認してください。", "Your timing is retained as beyond 90 days. There is no reason to rush into a formal Offer; return only if your conditions change.");
  if (has(text, /(家族.*(?:同意|決定|全員)|最終決定者.*(?:家族|私では)|family.*(?:approval|decide)|not the decision maker)/i)) return reply("nurture_authority", "ご家族の同意が未完了なので、正式Offerへは進めません。比較材料だけ確認し、全員が検討を望む場合に再開してください。", "Family approval is incomplete, so I will not move you to a formal Offer. Review only the comparison material and resume if everyone wishes to consider it.");

  if (!space) return reply("discover_space", "作品より先に、置かれる場所を知りたいのです。自宅・書斎・オフィス・ホテル・店舗・ウェルネス空間のどこへ迎えますか？", "Before choosing the work, I need to understand its place. Is it for a home, study, office, hotel, shop, or wellness space?");
  if (!effect) return reply("discover_effect", "その空間に残したい作用を一つだけ選ぶなら、始動・帰還・静けさ・儀式・宇宙のどれに近いですか？", "Which effect should remain in that space: ignition, return, calm, ritual, or cosmos?");
  if (!size) return reply("discover_size", "比率と推奨サイズを決めるため、飾る壁のおおよその横幅を教えてください。", "To determine the aspect ratio and recommended size, what is the approximate wall width?");
  if (!region) return reply("discover_region", "送料・製造可否・関税条件を確定するため、配送先の国または地域を教えてください。", "Which country or region will receive it, so we can confirm production, shipping and possible duties?");
  if (!budget) return reply("discover_budget", "一点の予算は、15万円未満・15〜33万円・33万円以上・まだ相談したい、のどれですか？", "Is the budget under ¥150k, ¥150–330k, ¥330k+, or still undecided?");
  if (!timing) return reply("discover_timing", "迎えたい時期は、30日以内・90日以内・それ以降のどれに近いですか？", "Is the intended timing within 30 days, within 90 days, or later?");
  if (!authority) return reply("discover_authority", "最後に、購入はご自身で決定されますか、それとも他の決定者へ提案されますか？", "Finally, will you decide the purchase, or present it to another decision maker?");
  if (!workSelected) return reply("discover_work", "条件は確認できましたが、作品はまだ選ばれていません。静けさならDeus sive Natura、始動なら33 IGNITION、帰還ならA Town Called Almost Home、儀式ならBALIANが軸です。公開Dossierを見る候補を一つ選びますか？", "The conditions are clear, but no work has been selected. Deus sive Natura anchors calm, 33 IGNITION a beginning, A Town Called Almost Home a return, and BALIAN ritual. Which public Dossier would you like to inspect?");
  return reply("close_to_dossier", "条件が揃いました。選んだ作品を保持したまま、下の非公開相談からDossier確認へ進めます。未承認作品は原画・比率・原価・配送を確認してから正式Offerを発行し、承認前に決済を開くことはありません。", "The essentials are complete. Continue to the private consultation below while keeping the selected work. For an unapproved catalog work, we verify the master, ratio, cost and delivery before issuing a formal Offer; checkout never opens before approval.", true);
}
