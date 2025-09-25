// lib/trace.ts
export function newTraceId() {
return Math.random().toString(36).slice(2) + Date.now().toString(36);
}