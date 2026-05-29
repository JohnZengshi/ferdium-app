import { cpus } from 'node:os';
import macosVersion from 'macos-version';
import {
  chromeVersion,
  is64Bit,
  isMac,
  isWindows,
  osArch,
  osRelease,
} from '../environment';

const macOS = () => {
  const version = macosVersion() ?? '';
  let cpuName = cpus()[0].model.split(' ')[0];
  if (cpuName.includes('(')) {
    // eslint-disable-next-line prefer-destructuring
    cpuName = cpuName.split('(')[0];
  }
  return `Macintosh; ${cpuName} macOS ${version.replaceAll('.', '_')}`;
};

const windows = () => {
  const version = osRelease;
  const [majorVersion, minorVersion] = version.split('.');
  const archString = is64Bit ? 'Win64' : 'Win32';
  return `Windows NT ${majorVersion}.${minorVersion}; ${archString}; ${osArch}`;
};

const linux = () => {
  const archString = is64Bit ? 'x86_64' : osArch;
  return `X11; Linux ${archString}`;
};

const CHROME_VERSIONS = Array.from({ length: 12 }, (_, i) => i + 120);
const SAFARI_VERSIONS = [17, 17.1, 17.2, 17.3, 17.4, 17.5];
const FIREFOX_VERSIONS = Array.from({ length: 10 }, (_, i) => i + 124);
const EDGE_VERSIONS = Array.from({ length: 12 }, (_, i) => i + 120);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type UABrowser = 'chrome' | 'safari' | 'firefox' | 'edge';

const MAC_BROWSER_WEIGHTS: UABrowser[] = [
  'chrome',
  'chrome',
  'chrome',
  'chrome',
  'safari',
  'safari',
  'safari',
  'firefox',
  'firefox',
  'edge',
  'edge',
];

const WINDOWS_BROWSER_WEIGHTS: UABrowser[] = [
  'chrome',
  'chrome',
  'chrome',
  'chrome',
  'chrome',
  'edge',
  'edge',
  'edge',
  'firefox',
  'firefox',
  'firefox',
];

function generateMacUA(): string {
  const browser = pick(MAC_BROWSER_WEIGHTS);
  switch (browser) {
    case 'chrome': {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pick(CHROME_VERSIONS)}.0.0.0 Safari/537.36`;
    }
    case 'safari': {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${pick(SAFARI_VERSIONS)} Safari/605.1.15`;
    }
    case 'firefox': {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${pick(FIREFOX_VERSIONS)}.0) Gecko/20100101 Firefox/${pick(FIREFOX_VERSIONS)}.0`;
    }
    case 'edge': {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pick(EDGE_VERSIONS)}.0.0.0 Safari/537.36 Edg/${pick(EDGE_VERSIONS)}.0.0.0`;
    }
    default: {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pick(CHROME_VERSIONS)}.0.0.0 Safari/537.36`;
    }
  }
}

function generateWindowsUA(): string {
  const browser = pick(WINDOWS_BROWSER_WEIGHTS);
  switch (browser) {
    case 'chrome': {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pick(CHROME_VERSIONS)}.0.0.0 Safari/537.36`;
    }
    case 'edge': {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pick(EDGE_VERSIONS)}.0.0.0 Safari/537.36 Edg/${pick(EDGE_VERSIONS)}.0.0.0`;
    }
    case 'firefox': {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${pick(FIREFOX_VERSIONS)}.0) Gecko/20100101 Firefox/${pick(FIREFOX_VERSIONS)}.0`;
    }
    default: {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pick(CHROME_VERSIONS)}.0.0.0 Safari/537.36`;
    }
  }
}

function buildPool(generator: () => string, size: number): string[] {
  const pool = new Set<string>();
  const maxAttempts = size * 5;
  let attempts = 0;
  while (pool.size < size && attempts < maxAttempts) {
    pool.add(generator());
    attempts += 1;
  }
  return [...pool];
}

const UA_POOL_SIZE = 100;

let macPool: string[] | null = null;
let windowsPool: string[] | null = null;
let macIndex = 0;
let windowsIndex = 0;

/**
 * Returns the next User-Agent string using round-robin from a large dynamic pool.
 * Guarantees no collisions within the same client session.
 *
 * - macOS → dynamic UA (Chrome / Safari / Edge / Firefox, random versions)
 * - Windows → dynamic UA (Chrome / Edge / Firefox, random versions)
 * - Linux → falls back to the real platform-aware UA
 *
 * The 100-entry pool is generated lazily at first call.
 */
export function getNextPlatformUserAgent(): string {
  if (isMac) {
    if (!macPool) macPool = buildPool(generateMacUA, UA_POOL_SIZE);
    const currentMacIndex = macIndex;
    macIndex += 1;
    return macPool[currentMacIndex % macPool.length];
  }
  if (isWindows) {
    if (!windowsPool) windowsPool = buildPool(generateWindowsUA, UA_POOL_SIZE);
    const currentWindowsIndex = windowsIndex;
    windowsIndex += 1;
    return windowsPool[currentWindowsIndex % windowsPool.length];
  }
  // For Linux or unknown, fall back to auto-generated real UA
  // eslint-disable-next-line no-use-before-define, @typescript-eslint/no-use-before-define
  return userAgent();
}

/**
 * Picks a random User-Agent from the platform's dynamic pool.
 * May produce collisions with other services on the same client.
 *
 * @deprecated Use {@link getNextPlatformUserAgent} for sequential allocation
 *             that guarantees no collisions within a session.
 */
export function getRandomPlatformUserAgent(): string {
  if (isMac) {
    if (!macPool) macPool = buildPool(generateMacUA, UA_POOL_SIZE);
    return macPool[Math.floor(Math.random() * macPool.length)];
  }
  if (isWindows) {
    if (!windowsPool) windowsPool = buildPool(generateWindowsUA, UA_POOL_SIZE);
    return windowsPool[Math.floor(Math.random() * windowsPool.length)];
  }
  // eslint-disable-next-line no-use-before-define, @typescript-eslint/no-use-before-define
  return userAgent();
}

export default function userAgent() {
  let platformString;

  if (isMac) {
    platformString = macOS();
  } else if (isWindows) {
    platformString = windows();
  } else {
    platformString = linux();
  }

  return `Mozilla/5.0 (${platformString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}
