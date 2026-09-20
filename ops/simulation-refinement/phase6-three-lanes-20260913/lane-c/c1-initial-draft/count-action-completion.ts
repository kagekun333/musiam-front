/** Deterministic boundary and action-completion checks. Model labels remain
 * proposals; this module only prevents a known false stop and exposes an
 * already-public action for a uniquely referenced, previously recommended work. */
export type CommercialBoundary={explicitOptOut:boolean;browsingWithoutPurchase:boolean};
export type ActionMedium="music"|"book"|"image"|null;
export type ActionWork={id?:string|number;title?:string;type?:string;cover?:string};
export type ActionLink={kind:string;url:string};

const explicitOptOutPatterns:RegExp[]=[
  /(?:もう|これ以上)?(?:売り込|営業).{0,12}(?:しないで|するな|やめて)/,
  /(?:商品|作品|カード|リンク).{0,18}(?:勧めないで|おすすめしないで|出さないで)/,
  /(?:don['’]?t|do not|stop)\b.{0,28}\b(?:sell|selling|recommend(?:ing)?|pitch(?:ing)?)/i,
  /(?:ne\s+)?(?:me\s+)?(?:vendez|recommande[rz]|proposez).{0,28}(?:pas|plus)/i,
  /(?:no\s+)?(?:me\s+)?(?:vendas|recomiendes|ofrezcas).{0,28}(?:más|nada)?/i,
  /(?:verkauf|empfehl).{0,18}(?:nicht|stoppen|aufhören)/i,
  /(?:لا|توقف).{0,24}(?:تبع|ترشح|توص)/
];
const browsingPatterns:RegExp[]=[
  /見るだけ|見ているだけ|今日は買わない|今(?:は|回は)?買わない|買う(?:つもり|気)はない|購入する(?:つもり|気)はない/,
  /just browsing|only browsing|not buying (?:today|now)|not looking to buy|won['’]?t buy/i,
  /je (?:regarde|n['’]achète) seulement|pas (?:pour )?acheter aujourd/i,
  /solo (?:miro|curiose)|no (?:voy a )?comprar hoy/i,
  /nur (?:schauen|gucken)|heute (?:nichts|nicht) kaufen/i,
  /(?:فقط|دون) (?:تصفح|شراء)|لن أشتري/
];
const linkDecline=/(?:リンク|カード).{0,12}(?:不要|いらない|出さないで)|(?:don['’]?t|do not|no)\b.{0,18}\b(?:link|card)s?|sans lien|sin enlaces?|keine? links?/i;
const actionRetraction=/(?:まだ|今は).{0,14}(?:聴きたくない|聞きたくない|見たくない|読みたくない)|前に.{0,24}(?:聴きたい|聞きたい).{0,28}(?:けど|が)|(?:not|don['’]?t|do not).{0,22}\b(?:listen|hear|open|read|watch)|(?:plus|pas) (?:écouter|lire|ouvrir)|no (?:quiero|quiero ya) (?:escuchar|leer|abrir)/i;
const changedReference=/(?:別の|ほかの|他の|違う|instead|another|different|rather another|autre|diferente|otro|andere[ns]?|stattdessen)/i;

export function classifyCommercialBoundary(text:string):CommercialBoundary {
  return {explicitOptOut:explicitOptOutPatterns.some(pattern=>pattern.test(text)),browsingWithoutPurchase:browsingPatterns.some(pattern=>pattern.test(text))};
}

export function requestedActionMedium(text:string):ActionMedium {
  if(/(?:聴(?:く|いて)|聞(?:く|いて)|試聴|再生|サンプル|muestra|escuchar|écouter|hören|listen|hear|preview|sample)/i.test(text))return "music";
  if(/(?:読(?:む|んで)|read|lire|lesen|leer|preview page)/i.test(text))return "book";
  if(/(?:見(?:る|せ)|開(?:く|いて)|open|view|watch|voir|zeigen|ver|abrir)/i.test(text))return "image";
  return null;
}

export function hasPositiveReferencedAction(text:string):boolean {
  const medium=requestedActionMedium(text);
  if(!medium||linkDecline.test(text)||actionRetraction.test(text))return false;
  return /(?:その|あの|前(?:の|に)|さっきの|that|this|previous(?:ly)?|esa|ese|esta|ce(?:tte)?|dies(?:e|en)|vorher)/i.test(text);
}

export function actionCompletionCandidate(input:{
  query:string;noLinks:boolean;salesStopped:boolean;recommendedIds:string[];rejectedIds:string[];works:ActionWork[];linksForWork:(work:ActionWork)=>ActionLink[];
}):{status:"NOT_ACTION_REQUEST"|"ACTIONABLE_BUT_NOT_COMPLETED"|"ACTIONABLE_COMPLETED";medium:ActionMedium;work?:ActionWork;links?:ActionLink[];reason:string} {
  const medium=requestedActionMedium(input.query);
  if(!medium)return {status:"NOT_ACTION_REQUEST",medium,reason:"No current listen/read/open request."};
  if(!hasPositiveReferencedAction(input.query))return {status:"ACTIONABLE_BUT_NOT_COMPLETED",medium,reason:"The current wording does not positively and specifically refer to a prior work action."};
  if(input.noLinks)return {status:"ACTIONABLE_BUT_NOT_COMPLETED",medium,reason:"Current user instruction forbids links/cards."};
  if(input.salesStopped)return {status:"ACTIONABLE_BUT_NOT_COMPLETED",medium,reason:"Explicit commercial opt-out remains active."};
  if(changedReference.test(input.query))return {status:"ACTIONABLE_BUT_NOT_COMPLETED",medium,reason:"Current wording changes the earlier work reference."};
  const rejected=new Set(input.rejectedIds);
  for(const id of [...input.recommendedIds].reverse()){
    if(rejected.has(id))continue;
    const work=input.works.find(candidate=>String(candidate.id)===id);
    if(!work||work.type!==medium)continue;
    const links=input.linksForWork(work);
    if(links.length)return {status:"ACTIONABLE_COMPLETED",medium,work,links,reason:"Current request positively refers to the latest eligible prior work of the requested medium."};
  }
  return {status:"ACTIONABLE_BUT_NOT_COMPLETED",medium,reason:"No eligible previously recommended work with an existing public action link."};
}

/** A prior explicit stop may be set aside only for the visitor's current,
 * narrow product/price/purchase inquiry. It is not a general sales reopening. */
export function hasCurrentCommerceInquiry(text:string):boolean {
  return /(?:価格|値段|購入|買う|商品|受取|配送|返金|権利|ギフト|price|buy|purchase|product|delivery|refund|rights?|gift|prix|acheter|produit|livraison|remboursement|precio|comprar|producto|entrega|reembolso|preis|kaufen|produkt|liefer|rückgabe|حق|سعر|شراء|منتج|تسليم)/i.test(text);
}
