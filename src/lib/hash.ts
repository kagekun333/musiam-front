export function hash32(str: string): number {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  return hash32(seed) % modulo;
}
