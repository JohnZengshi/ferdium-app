#!/usr/bin/env node

/* eslint-disable no-console, no-continue */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const PRODUCT_NAME = 'AITALK';
const args = new Set(process.argv.slice(2));
const reuse = args.has('--reuse');
const dryRun = args.has('--dry-run');

const showHelp = () => {
  console.log(`快速构建并启动真实解包版 AITALK，启用性能采集。

用法:
  pnpm start:performance:packaged
  pnpm start:performance:packaged -- --reuse
  pnpm start:performance:packaged -- --dry-run

选项:
  --reuse    跳过构建，直接启动现有 out/ 解包产物
  --dry-run  仅打印将执行的命令和目标路径
  --help     显示帮助

构建策略:
  - 生产 esbuild（无 watch、无开发注入、无 source map）
  - 从根 node_modules 复制正确架构的原生模块到 build/
  - 打包后审计原生模块架构，不匹配则失败
  - electron-builder --dir，仅生成解包目录
  - 跳过安装包、发布、macOS 签名、公证
  - 不运行 typecheck、lint、test
`);
};

if (args.has('--help') || args.has('-h')) {
  showHelp();
  process.exit(0);
}

const archFlag = (() => {
  switch (process.arch) {
    case 'arm64': {
      return '--arm64';
    }
    case 'ia32': {
      return '--ia32';
    }
    case 'x64': {
      return '--x64';
    }
    default: {
      throw new Error(`Unsupported architecture: ${process.arch}`);
    }
  }
})();

const platformName = (() => {
  switch (process.platform) {
    case 'darwin': {
      return 'darwin';
    }
    case 'linux': {
      return 'linux';
    }
    case 'win32': {
      return 'win32';
    }
    default: {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
})();

const platformFlag = {
  darwin: '--mac',
  linux: '--linux',
  win32: '--win',
}[platformName];

const unpackedDirectory = (() => {
  if (process.platform === 'darwin') {
    return join(ROOT, 'out', process.arch === 'arm64' ? 'mac-arm64' : 'mac');
  }
  if (process.platform === 'win32') {
    return join(
      ROOT,
      'out',
      process.arch === 'x64' ? 'win-unpacked' : `win-${process.arch}-unpacked`,
    );
  }
  return join(
    ROOT,
    'out',
    process.arch === 'x64'
      ? 'linux-unpacked'
      : `linux-${process.arch}-unpacked`,
  );
})();

const executablePath = (() => {
  if (process.platform === 'darwin') {
    return join(
      unpackedDirectory,
      `${PRODUCT_NAME}.app`,
      'Contents',
      'MacOS',
      PRODUCT_NAME,
    );
  }
  if (process.platform === 'win32') {
    return join(unpackedDirectory, `${PRODUCT_NAME}.exe`);
  }
  return join(unpackedDirectory, 'aitalk');
})();

const formatCommand = (command, commandArgs) =>
  [command, ...commandArgs]
    .map(part => (part.includes(' ') ? JSON.stringify(part) : part))
    .join(' ');

const run = (command, commandArgs, options = {}) => {
  console.log(`\n$ ${formatCommand(command, commandArgs)}`);
  if (dryRun) return;

  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

// ── Mach-O architecture detection ─────────────────────────────────────

const CPU_TYPE_X86_64 = 0x01_00_00_07;
const CPU_TYPE_ARM64 = 0x01_00_00_0c;

function getMachOArch(filePath) {
  const buf = readFileSync(filePath);
  // Mach-O 64-bit magic: 0xfeedfacf (little-endian: cf fa ed fe)
  if (
    buf[0] !== 0xcf ||
    buf[1] !== 0xfa ||
    buf[2] !== 0xed ||
    buf[3] !== 0xfe
  ) {
    return 'unknown';
  }
  const cputype = buf.readUInt32LE(4);
  if (cputype === CPU_TYPE_X86_64) return 'x86_64';
  if (cputype === CPU_TYPE_ARM64) return 'arm64';
  return `unknown(0x${cputype.toString(16)})`;
}

// ── Native module paths ───────────────────────────────────────────────

const NATIVE_MODULE_REL =
  process.platform === 'darwin'
    ? [
        'node_modules/macos-notification-state/build/Release/notificationstate.node',
        'node_modules/macos-notification-state/build/Release/focuscenter.node',
        'node_modules/node-mac-permissions/build/Release/permissions.node',
      ]
    : [];

// ── Copy correct-arch native binaries ─────────────────────────────────

function syncNativeBinaries() {
  console.log('\nSyncing native binaries from root node_modules → build/');

  for (const relPath of NATIVE_MODULE_REL) {
    const src = join(ROOT, relPath);
    const dst = join(ROOT, 'build', relPath);

    if (!existsSync(src)) {
      console.log(`  skip (not found): ${relPath}`);
      continue;
    }

    const srcArch = getMachOArch(src);
    console.log(`  ${relPath}: ${srcArch}`);

    const expectedArch = process.arch === 'x64' ? 'x86_64' : process.arch;
    if (srcArch !== expectedArch) {
      console.error(`  ❌ root binary is ${srcArch}, expected ${expectedArch}`);
      console.error('     Run pnpm install to rebuild native modules');
      process.exit(1);
    }

    if (dryRun) {
      continue;
    }

    try {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      console.log(`  ✅ copied to build/${relPath}`);
    } catch {
      console.error(`  ❌ failed to copy to build/${relPath}`);
      process.exit(1);
    }
  }
}

// ── Architecture audit ────────────────────────────────────────────────

function auditNativeModules(baseDir, label) {
  if (dryRun) {
    console.log(`\n[audit] ${label}: (skipped in dry-run)`);
    return;
  }

  const failures = [];

  for (const relPath of NATIVE_MODULE_REL) {
    const fullPath = join(baseDir, relPath);
    if (!existsSync(fullPath)) {
      continue;
    }

    const arch = getMachOArch(fullPath);
    const expectedArch = process.arch === 'x64' ? 'x86_64' : process.arch;
    if (arch !== expectedArch) {
      failures.push(`${relPath}: expected ${expectedArch}, found ${arch}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n❌ Architecture audit FAILED (${label}):`);
    for (const f of failures) {
      console.error(`   ${f}`);
    }
    process.exit(1);
  }

  console.log(`\n✅ Architecture audit passed (${label})`);
}

// ── Build ─────────────────────────────────────────────────────────────

console.log('AITALK packaged performance monitor');
console.log(`Platform: ${process.platform}/${process.arch}`);
console.log(`Output: ${unpackedDirectory}`);

if (!reuse) {
  // 1. Generate buildInfo
  run('pnpm', ['exec', 'preval-build-info-cli']);

  // 2. Production esbuild (cleans build/, generates build/package.json)
  run(process.execPath, ['-r', 'dotenv/config', 'esbuild.mjs']);

  // 3. install-app-deps creates build/node_modules directory structure.
  //    It may install wrong-arch native binaries (known issue), but we
  //    fix that in the next step.
  run(
    process.execPath,
    [
      'node_modules/electron-builder/cli.js',
      'install-app-deps',
      `--platform=${platformName}`,
      `--arch=${process.arch}`,
    ],
    { env: { CSC_IDENTITY_AUTO_DISCOVERY: 'false' } },
  );

  // 4. Sync native binaries: overwrite any wrong-arch .node files in
  //    build/node_modules with correct-arch ones from root node_modules.
  syncNativeBinaries();

  // 5. Audit: verify build/node_modules native modules match target arch
  auditNativeModules(join(ROOT, 'build'), 'build/node_modules');

  // 6. Package with npmRebuild=false to prevent electron-builder from
  //    re-building native modules with wrong arch.
  const builderArgs = [
    '-r',
    'dotenv/config',
    'node_modules/electron-builder/cli.js',
    '--dir',
    platformFlag,
    archFlag,
    '--publish',
    'never',
    '-c.npmRebuild=false',
  ];

  if (process.platform === 'darwin') {
    builderArgs.push('-c.mac.identity=null', '-c.mac.notarize=false');
  }

  run(process.execPath, builderArgs, {
    env: {
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  });

  // 6. Post-build audit
  auditNativeModules(join(ROOT, 'build'), 'post-build');
}

console.log(`\nPackaged executable: ${executablePath}`);

if (dryRun) {
  console.log('\nDry run complete.');
  process.exit(0);
}

if (!existsSync(executablePath)) {
  console.error(
    `Packaged executable not found: ${executablePath}\nRun without --reuse to rebuild it.`,
  );
  process.exit(1);
}

console.log('\nPerformance metrics enabled.');
console.log('The exact JSONL path is printed as "JSONL output enabled ...".');
console.log('Close AITALK to stop this command.\n');

run(executablePath, [], {
  env: {
    DEBUG: 'Ferdium:Performance',
    ELECTRON_IS_DEV: '0',
    PERFORMANCE_METRICS: '1',
    PERFORMANCE_METRICS_JSONL: '1',
    SKIP_AUTO_UPDATE: '1',
    SKIP_MACOS_APP_LOCATION_CHECK: '1',
  },
});
