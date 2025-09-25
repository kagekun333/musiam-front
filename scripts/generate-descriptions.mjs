// scripts/generate-descriptions.mjs
const MODEL = process.env.CODEX_MODEL || 'gpt-4o-mini';


if (!API_KEY) {
console.error('[desc] OPENAI_API_KEY missing');
process.exit(1);
}


const WORKS_PATH = path.resolve('public/works/works.json');


function readWorks(){
const raw = fs.readFileSync(WORKS_PATH,'utf8');
const data = JSON.parse(raw);
const list = Array.isArray(data) ? data : (data.items||data.data||data.works||[]);
return {data, list};
}


async function chatJSON({title, type, tags}){
const sys = `あなたは作品紹介のコピーライターです。日本語で出力します。`;
const usr = `次の作品の説明を140字以内・句読点少なめ・比喩は控えめで1〜2文で作って。返答はJSONのみ。
タイトル: ${title}
タイプ: ${type||''}
ヒントタグ: ${(tags||[]).join(', ')}`;
const body = {
model: MODEL,
temperature: 0.3,
response_format: { type: 'json_object' },
messages:[
{role:'system', content: sys},
{role:'user', content: usr}
]
};
const res = await fetch(`${BASE_URL}/chat/completions`,{
method:'POST',
headers:{'Content-Type':'application/json','Authorization':`Bearer ${API_KEY}`},
body: JSON.stringify(body)
});
const json = await res.json();
const txt = json.choices?.[0]?.message?.content || '{}';
try { return JSON.parse(txt); } catch { return {}; }
}


(async () => {
const {data, list} = readWorks();
let updated = 0;
for (const w of list) {
if (w.description && String(w.description).trim().length >= 10) continue;
const j = await chatJSON({title:w.title, type:w.type, tags:[...(w.tags||[]), ...(w.moodSeeds||[])]});
const desc = (j.description||'').trim();
if (desc) { w.description = desc; updated++; }
}
const out = Array.isArray(data) ? list : {...data};
if (!Array.isArray(data)) {
if (data.items) out.items = list; else if (data.data) out.data = list; else if (data.works) out.works = list;
}
fs.writeFileSync(WORKS_PATH, JSON.stringify(out, null, 2));
console.log('descriptions updated:', updated);
})();