import {
  generateAudioNoise,
  generateCanvasNoise,
  generateFingerprint,
} from '../../src/helpers/fingerprint-helpers';
import { GPU_CONFIGS } from '../../src/helpers/gpu-configs';

const HARDWARE_CONCURRENCY_OPTIONS = [2, 4, 6, 8, 12, 16];
const DEVICE_MEMORY_OPTIONS = [2, 4, 8, 16];

describe('fingerprint-helpers', () => {
  describe('generateFingerprint', () => {
    it('returns a complete config with all required fields', () => {
      const config = generateFingerprint('test-service');

      expect(config).toHaveProperty('canvasSeed');
      expect(config).toHaveProperty('webglConfig');
      expect(config).toHaveProperty('audioSeed');
      expect(config).toHaveProperty('hardwareConcurrency');
      expect(config).toHaveProperty('deviceMemory');
      expect(config).toHaveProperty('languages');
      expect(config).toHaveProperty('userAgentData');
      expect(config.userAgentData).toHaveProperty('brands');
      expect(config.userAgentData).toHaveProperty('mobile');
      expect(config.userAgentData).toHaveProperty('platform');
    });

    it('is deterministic: same serviceId produces same fingerprint', () => {
      const config1 = generateFingerprint('my-service');
      const config2 = generateFingerprint('my-service');

      expect(config1).toEqual(config2);
    });

    it('produces different fingerprints for different serviceIds', () => {
      const config1 = generateFingerprint('service-a');
      const config2 = generateFingerprint('service-b');

      // At least one field should differ (extremely unlikely to be identical)
      const isIdentical =
        config1.canvasSeed === config2.canvasSeed &&
        config1.audioSeed === config2.audioSeed &&
        config1.webglConfig.vendor === config2.webglConfig.vendor &&
        config1.webglConfig.renderer === config2.webglConfig.renderer &&
        config1.hardwareConcurrency === config2.hardwareConcurrency &&
        config1.deviceMemory === config2.deviceMemory;
      expect(isIdentical).toBe(false);
    });

    it('picks webglConfig from GPU_CONFIGS pool', () => {
      const config = generateFingerprint('test-gpu');
      const isGpuConfig = GPU_CONFIGS.some(
        gpu =>
          gpu.vendor === config.webglConfig.vendor &&
          gpu.renderer === config.webglConfig.renderer,
      );
      expect(isGpuConfig).toBe(true);
    });

    it('picks hardwareConcurrency from valid options', () => {
      const config = generateFingerprint('test-hw');
      expect(HARDWARE_CONCURRENCY_OPTIONS).toContain(
        config.hardwareConcurrency,
      );
    });

    it('picks deviceMemory from valid options', () => {
      const config = generateFingerprint('test-mem');
      expect(DEVICE_MEMORY_OPTIONS).toContain(config.deviceMemory);
    });

    it('returns a non-empty array of string languages', () => {
      const config = generateFingerprint('test-lang');

      expect(Array.isArray(config.languages)).toBe(true);
      expect(config.languages.length).toBeGreaterThan(0);
      for (const lang of config.languages) {
        expect(typeof lang).toBe('string');
      }
    });

    it('has exactly 3 userAgentData.brands entries', () => {
      const config = generateFingerprint('test-brands');

      expect(config.userAgentData.brands).toHaveLength(3);
    });

    it('has Chromium, Chrome, and Not_A Brand as brands', () => {
      const config = generateFingerprint('test-brands-names');
      const brandNames = config.userAgentData.brands.map(b => b.brand);

      expect(brandNames).toContain('Chromium');
      expect(brandNames).toContain('Google Chrome');
      expect(brandNames).toContain('Not_A Brand');
    });

    it('sets userAgentData.mobile to false', () => {
      const config = generateFingerprint('test-mobile');
      expect(config.userAgentData.mobile).toBe(false);
    });

    it('sets userAgentData.platform to Windows or macOS', () => {
      const config = generateFingerprint('test-platform');
      expect(['Windows', 'macOS']).toContain(config.userAgentData.platform);
    });

    it('sets platform to macOS when vendor includes Apple', () => {
      // Find a serviceId that produces an Apple GPU config
      let applePlatform: string | undefined;
      for (let i = 0; i < 100; i += 1) {
        const config = generateFingerprint(`apple-search-${i}`);
        if (config.webglConfig.vendor.includes('Apple')) {
          applePlatform = config.userAgentData.platform;
          break;
        }
      }
      expect(applePlatform).toBe('macOS');
    });
  });

  describe('generateCanvasNoise', () => {
    it('returns an Int8Array', () => {
      const noise = generateCanvasNoise(42, 10, 10);
      expect(noise).toBeInstanceOf(Int8Array);
    });

    it('returns correct length (width * height * 3)', () => {
      const width = 32;
      const height = 24;
      const noise = generateCanvasNoise(42, width, height);
      expect(noise.length).toBe(width * height * 3);
    });

    it('all values are in range [-3, +3]', () => {
      const noise = generateCanvasNoise(123, 50, 50);
      for (const element of noise) {
        expect(element).toBeGreaterThanOrEqual(-3);
        expect(element).toBeLessThanOrEqual(3);
      }
    });

    it('is deterministic for same seed', () => {
      const noise1 = generateCanvasNoise(99, 10, 10);
      const noise2 = generateCanvasNoise(99, 10, 10);
      expect(noise1).toEqual(noise2);
    });

    it('produces different noise for different seeds', () => {
      const noise1 = generateCanvasNoise(1, 10, 10);
      const noise2 = generateCanvasNoise(2, 10, 10);
      // Very unlikely to be identical
      expect(noise1).not.toEqual(noise2);
    });
  });

  describe('generateAudioNoise', () => {
    it('returns a Float32Array', () => {
      const noise = generateAudioNoise(42, 100);
      expect(noise).toBeInstanceOf(Float32Array);
    });

    it('returns correct length', () => {
      const length = 44_100;
      const noise = generateAudioNoise(42, length);
      expect(noise.length).toBe(length);
    });

    it('all values are in range [-0.0001, +0.0001]', () => {
      const noise = generateAudioNoise(123, 1000);
      for (const element of noise) {
        expect(element).toBeGreaterThanOrEqual(-0.0001);
        expect(element).toBeLessThanOrEqual(0.0001);
      }
    });

    it('is deterministic for same seed', () => {
      const noise1 = generateAudioNoise(99, 100);
      const noise2 = generateAudioNoise(99, 100);
      expect(noise1).toEqual(noise2);
    });

    it('produces different noise for different seeds', () => {
      const noise1 = generateAudioNoise(1, 100);
      const noise2 = generateAudioNoise(2, 100);
      expect(noise1).not.toEqual(noise2);
    });
  });

  describe('edge cases', () => {
    it('handles empty string serviceId without throwing', () => {
      expect(() => generateFingerprint('')).not.toThrow();
      const config = generateFingerprint('');
      expect(config).toHaveProperty('canvasSeed');
    });

    it('handles very long serviceId (1000+ chars) without throwing', () => {
      const longId = 'a'.repeat(1500);
      expect(() => generateFingerprint(longId)).not.toThrow();
      const config = generateFingerprint(longId);
      expect(config).toHaveProperty('canvasSeed');
    });

    it('empty string serviceId produces valid config fields', () => {
      const config = generateFingerprint('');
      expect(HARDWARE_CONCURRENCY_OPTIONS).toContain(
        config.hardwareConcurrency,
      );
      expect(DEVICE_MEMORY_OPTIONS).toContain(config.deviceMemory);
      expect(config.languages.length).toBeGreaterThan(0);
      expect(config.userAgentData.brands).toHaveLength(3);
    });

    it('very long serviceId produces valid config fields', () => {
      const longId = 'x'.repeat(2000);
      const config = generateFingerprint(longId);
      expect(HARDWARE_CONCURRENCY_OPTIONS).toContain(
        config.hardwareConcurrency,
      );
      expect(DEVICE_MEMORY_OPTIONS).toContain(config.deviceMemory);
      expect(config.languages.length).toBeGreaterThan(0);
      expect(config.userAgentData.brands).toHaveLength(3);
    });
  });
});
