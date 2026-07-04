export function calculateZScore(value: number, L: number, M: number, S: number) {
  if (value <= 0 || M <= 0 || S === 0) return 0;
  const z = L === 0 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);
  return Math.max(-6, Math.min(6, Number(z.toFixed(2))));
}

export const classifyWAZ = (z: number) => z < -3 ? "severely_underweight" : z < -2 ? "underweight" : z <= 2 ? "normal" : "overweight";
export const classifyHAZ = (z: number) => z < -3 ? "severely_stunted" : z < -2 ? "stunted" : z <= 2 ? "normal" : "tall";
export const classifyWHZ = (z: number) => z < -3 ? "severely_wasted" : z < -2 ? "wasted" : z <= 2 ? "normal" : z <= 3 ? "overweight" : "obese";
