/* eslint-disable no-bitwise, unicorn/prefer-math-trunc, unicorn/prefer-code-point -- Bitwise ops essential for PRNG */
export type PRNG = () => number;

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function seededRandom(seed: string): PRNG {
  let state = djb2Hash(seed) || 1;
  return () => {
    state = Math.trunc(state);
    state = (state + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function randomInt(gen: PRNG, min: number, max: number): number {
  return Math.floor(gen() * (max - min + 1)) + min;
}

export function randomFloat(gen: PRNG, min: number, max: number): number {
  return gen() * (max - min) + min;
}

export function randomChoice<T>(gen: PRNG, array: readonly T[]): T {
  return array[Math.floor(gen() * array.length)];
}

export function shuffleArray<T>(gen: PRNG, array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(gen() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
