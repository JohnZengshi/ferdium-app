import { GPU_CONFIGS } from './gpu-configs';
import { randomChoice, randomFloat, randomInt, seededRandom } from './random';

export interface FingerprintConfig {
  canvasSeed: number;
  webglConfig: { vendor: string; renderer: string };
  audioSeed: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  languages: string[];
  userAgentData: {
    brands: { brand: string; version: string }[];
    mobile: boolean;
    platform: string;
  };
}

const HARDWARE_CONCURRENCY_OPTIONS = [2, 4, 6, 8, 12, 16] as const;
const DEVICE_MEMORY_OPTIONS = [2, 4, 8, 16] as const;

const LANGUAGE_POOL: readonly (readonly string[])[] = [
  ['en-US', 'en'],
  ['en-GB', 'en'],
  ['zh-CN', 'zh'],
  ['zh-TW', 'zh'],
  ['ja-JP', 'ja'],
  ['ko-KR', 'ko'],
  ['de-DE', 'de'],
  ['fr-FR', 'fr'],
  ['es-ES', 'es'],
  ['pt-BR', 'pt'],
  ['it-IT', 'it'],
  ['ru-RU', 'ru'],
  ['ar-SA', 'ar'],
  ['hi-IN', 'hi'],
  ['nl-NL', 'nl'],
];

const CHROMIUM_BRAND_TEMPLATES = [
  { brand: 'Chromium', alwaysMajor: true },
  { brand: 'Google Chrome', alwaysMajor: true },
  { brand: 'Not_A Brand', alwaysMajor: false },
] as const;

export function generateFingerprint(serviceId: string): FingerprintConfig {
  const gen = seededRandom(serviceId);

  const webglConfig = randomChoice(gen, GPU_CONFIGS);
  const hardwareConcurrency = randomChoice(gen, HARDWARE_CONCURRENCY_OPTIONS);
  const deviceMemory = randomChoice(gen, DEVICE_MEMORY_OPTIONS);
  const languages = [...randomChoice(gen, LANGUAGE_POOL)];
  const canvasSeed = randomInt(gen, 0, 2 ** 31 - 1);
  const audioSeed = randomInt(gen, 0, 2 ** 31 - 1);

  const majorVersion = String(randomInt(gen, 120, 131));
  const brands = CHROMIUM_BRAND_TEMPLATES.map(t => ({
    brand: t.brand,
    version: t.alwaysMajor ? majorVersion : '24',
  }));

  const platform = webglConfig.vendor.includes('Apple') ? 'macOS' : 'Windows';

  return {
    canvasSeed,
    webglConfig: { vendor: webglConfig.vendor, renderer: webglConfig.renderer },
    audioSeed,
    hardwareConcurrency,
    deviceMemory,
    languages,
    userAgentData: {
      brands,
      mobile: false,
      platform,
    },
  };
}

export function generateCanvasNoise(
  seed: number,
  width: number,
  height: number,
): Int8Array {
  const gen = seededRandom(`canvas-${seed}`);
  const noise = new Int8Array(width * height * 3);
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = randomInt(gen, -3, 3);
  }
  return noise;
}

export function generateAudioNoise(seed: number, length: number): Float32Array {
  const gen = seededRandom(`audio-${seed}`);
  const noise = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    noise[i] = randomFloat(gen, -0.0001, 0.0001);
  }
  return noise;
}
