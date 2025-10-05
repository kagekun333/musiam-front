const fs = require('fs');

const lots = JSON.parse(fs.readFileSync('./src/data/kannon_100_ranked.json','utf-8'));

// 句切り
const SEP = /[。．\.，、\/\n\r]+/g;

// ポジ語（肯定/達成/回復/順利）
const POS = [
  /會(實現|達成|好轉|治好|康復|出現|順利|平安|有利|開展|成功|得)/,
  /(能夠|可以|可望|可得|有望|吉利|大吉|吉祥|喜|安泰|興隆|合)/,
  /(尚可|不錯|良好)/,
];

// ネガ語（困難/不能/災禍/損）
const NEG = [
  /(難|不易|不可|不能|不會|未必|危險|災|禍|損|敗|惡|憂|祟|病重|失)/,
  /(找不到|難找到|難以找到)/,
];

// 遅延・未確定（末吉/小吉側に寄りやすい）
const DELAY = [
  /(遲遲|拖長|拖延|久|慢|觀望|時機未到)/,
];

// 教訓→好転（条件付きポジ：中正・謹慎で好転）
const ADMON = [
  /(守(中|正)|謹慎|積德|修身|忍耐|待時|順天|行善)/,
];

// 強ネガ（致命）
const FATAL = [
  /(再三(災|禍)|危及生命|大禍|大災)/,
];

function clauseScore(s) {
  let p=0,n=0;
  // 強ネガは優先
  if (FATAL.some(r=>r.test(s))) n-=3;
  if (POS.some(r=>r.test(s))) p+=2;
  if (NEG.some(r=>r.test(s))) n-=2;
  if (DELAY.some(r=>r.test(s))) n-=1;
  if (ADMON.some(r=>r.test(s))) p+=1.5;
  return {p, n, delta:p+n};
}

function expected(rank){
  if(rank==='大吉') return +2;
  if(['吉','半吉','小吉','末小吉','末吉'].includes(rank)) return +1;
  if(rank==='凶') return -1;
  return 0;
}

const out = [];
for (const x of lots){
  const text = (x.poem||[]).join(' ');
  const clauses = text.split(SEP).map(s=>s.trim()).filter(Boolean);
  let P=0,N=0;
  for (const c of clauses){
    const {p,n} = clauseScore(c);
    P+=p; N+=n;
  }
  const delta = P+N;
  const exp = expected(x.rank);

  // 乖離判定（閾値は経験則）
  const mismatch =
    (exp>0 && delta<=-1) ||     // 吉系なのに総和がマイナス
    (exp<0 && delta>=+1) ||     // 凶なのに総和がプラス
    /\：$|:$/.test(text);       // 未完コロンで終わる行がある

  if (mismatch) {
    out.push({
      number: x.number,
      rank: x.rank,
      score: Number(delta.toFixed(1)),
      pos: Number(P.toFixed(1)),
      neg: Number(N.toFixed(1)),
      sample: (x.poem||[])[0]||''
    });
  }
}

// スコアの“乖離強度”で並べる（凶なのにプラスが大きい / 吉なのにマイナスが大きい）
out.sort((a,b)=>{
  const wa = (a.rank==='凶') ? -a.score : a.score;
  const wb = (b.rank==='凶') ? -b.score : b.score;
  return wb - wa;
});

fs.writeFileSync('./tempdata/qa_report.json', JSON.stringify(out,null,2), 'utf-8');
console.log(`[OK] QA candidates: ${out.length} -> tempdata/qa_report.json`);
