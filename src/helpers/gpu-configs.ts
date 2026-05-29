export interface GpuConfig {
  vendor: string;
  renderer: string;
}

/**
 * Pool of 25 real WebGL GPU configurations for fingerprint spoofing.
 *
 * Covers:
 * - Intel integrated GPUs (UHD 610/620/630/730/770, Iris Xe, Iris Plus)
 * - NVIDIA discrete GPUs (GTX 1050/1060/1650/1660, RTX 2060/3060/3070/4060)
 * - AMD discrete GPUs (RX 560/580/6600/7600)
 * - Apple Silicon (M1/M1 Pro/M2/M2 Pro/M3/M3 Pro)
 *
 * All vendor/renderer strings match real WebGL reports from actual hardware.
 */
export const GPU_CONFIGS: readonly GpuConfig[] = [
  // --- Intel Integrated ---
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 610, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 730, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) Iris(R) Plus Graphics, OpenGL 4.5)',
  },

  // --- NVIDIA Discrete ---
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060, OpenGL 4.5)',
  },

  // --- AMD Discrete ---
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 560, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 6600, OpenGL 4.5)',
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 7600, OpenGL 4.5)',
  },

  // --- Apple Silicon ---
  {
    vendor: 'Apple',
    renderer: 'Apple M1',
  },
  {
    vendor: 'Apple',
    renderer: 'Apple M1 Pro',
  },
  {
    vendor: 'Apple',
    renderer: 'Apple M2',
  },
  {
    vendor: 'Apple',
    renderer: 'Apple M2 Pro',
  },
  {
    vendor: 'Apple',
    renderer: 'Apple M3',
  },
  {
    vendor: 'Apple',
    renderer: 'Apple M3 Pro',
  },
] as const;
