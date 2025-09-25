// lib/json.ts
export function safeJSON<T>(txt: string, fallback: T): T {
try {
return JSON.parse(txt) as T;
} catch {
return fallback;
}
}


export function stripFences(s: string) {
const t = s.trim();
if (!t.startsWith("```") ) return t;
return t
.replace(/^```json\s*/i, "")
.replace(/^```\s*/i, "")
.replace(/```$/i, "")
.trim();
}