#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import chalk from 'chalk';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import * as dotenv from 'dotenv';
import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { sassPlugin } from 'esbuild-sass-plugin';
import fsPkg from 'fs-extra';
import livereload from 'gulp-livereload';
import moment from 'moment';
import * as buildInfo from 'preval-build-info';
import glob from 'tiny-glob';

dotenv.config();

const { log } = console;

const outDir = 'build';

const staticAssets = () => [
  copy({
    assets: {
      from: ['./src/internal-server/**/*.{json,ini,edge,css,png,sqlite}'],
      to: ['./internal-server'],
    },
  }),
  copy({
    assets: {
      from: ['./src/internal-server/ace'],
      to: ['./internal-server'],
    },
  }),
  copy({
    assets: {
      from: ['./recipes/archives/*.tar.gz'],
      to: ['./recipes'],
    },
  }),
  copy({
    assets: {
      from: ['./recipes/*.json'],
      to: ['./recipes'],
    },
  }),
  copy({
    assets: {
      from: ['./src/**/*.json'],
      to: ['./'],
    },
  }),
  copy({
    assets: {
      from: ['./src/assets/**'],
      to: ['./assets'],
    },
  }),
  copy({
    assets: {
      from: ['./src/index.html'],
      to: ['./'],
    },
  }),
];

const copyManualAssets = ({ isDev = false } = {}) => {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  // Ensure styles directory exists for Tailwind output
  const stylesDir = path.join(outDir, 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }

  const pkgJson = fsPkg.readJsonSync('package.json');
  delete pkgJson.devDependencies;
  fsPkg.writeJsonSync(`${outDir}/package.json`, pkgJson, { spaces: 2 });
  fs.copyFileSync('electron-builder.npmrc', `${outDir}/.npmrc`);

  // Copy patches directory for pnpm patch support
  const patchesDir = 'patches';
  const buildPatchesDir = path.join(outDir, patchesDir);
  if (fs.existsSync(patchesDir)) {
    fsPkg.copySync(patchesDir, buildPatchesDir);
  }

  // Copy code-inspector-plugin client runtime for dev mode (esbuild can't inject into HTML)
  if (isDev) {
    try {
      const require = createRequire(import.meta.url);
      // Resolve the plugin's path to access its transitive deps
      const pluginPath = require.resolve('code-inspector-plugin');
      // Create a require scoped to the plugin directory so we can resolve @code-inspector/core
      // through pnpm's virtual store without hardcoding version strings
      const pluginRequire = createRequire(pluginPath);
      const coreEntryPath = pluginRequire.resolve('@code-inspector/core');
      const inspectorClientPath = path.resolve(
        coreEntryPath,
        '..',
        'client.iife.js',
      );

      if (fs.existsSync(inspectorClientPath)) {
        fs.copyFileSync(inspectorClientPath, `${outDir}/client.iife.js`);
        log(chalk.blue('Copied code-inspector client runtime'));
      } else {
        log(
          chalk.yellow(
            `code-inspector client runtime not found at ${inspectorClientPath}`,
          ),
        );
      }
    } catch (err) {
      log(
        chalk.yellow(
          `Failed to copy code-inspector client runtime: ${err.message}`,
        ),
      );
    }
  }

  const buildInfoData = {
    timestamp: buildInfo.timestamp,
    gitHashShort: buildInfo.gitHashShort,
    gitBranch: buildInfo.gitBranch,
  };
  fsPkg.outputJsonSync(`${outDir}/buildInfo.json`, buildInfoData);
};

const runTailwind = (watch = false) => {
  const args = [
    'tailwindcss',
    '-i',
    './src/styles/tailwind.css',
    '-o',
    './build/styles/tailwind.css',
    '--config',
    './tailwind.config.js',
  ];

  if (watch) {
    args.push('--watch');
    return spawn('pnpm', args, {
      stdio: 'inherit',
      shell: true,
    });
  }

  // Synchronous initial build
  execSync(`pnpm ${args.join(' ')}`, { stdio: 'inherit' });
  return null;
};

const runEsbuild = async () => {
  const startTime = performance.now();

  const myArgs = process.argv.slice(2);
  const isDev = myArgs.includes('--watch');
  log(chalk.blue('Starting with args'), myArgs);

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { force: true, recursive: true });
    log(chalk.blue('Cleaning'), outDir);
  }
  copyManualAssets({ isDev });

  // Ensure styles directory exists for Tailwind output
  const stylesDir = path.join(outDir, 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }

  // First, run a synchronous Tailwind build to ensure the file exists for esbuild/HTML
  log(chalk.blue('Running initial Tailwind CSS build...'));
  runTailwind(false); // This will call execSync and block until done

  let tailwindWatcher = null;
  if (isDev) {
    // If in dev mode, then spawn a watcher
    log(chalk.blue('Spawning Tailwind CSS watcher...'));
    tailwindWatcher = runTailwind(true);
  }

  process.on('exit', () => {
    tailwindWatcher?.kill();
  });

  // Source files
  const entryPoints = await glob('./src/**/*.{ts,tsx,js,jsx}');

  // Scss entry points
  entryPoints.push(
    'src/styles/main.scss',
    'src/styles/vertical.scss',
    'src/styles/animations.scss',
  );

  // Inject env vars from .env into bundle
  const envDefines = {};
  const envConfig = dotenv.config().parsed || {};
  for (const key of Object.keys(envConfig)) {
    envDefines[`process.env.${key}`] = JSON.stringify(process.env[key]);
  }

  // Run build
  await esbuild.build({
    entryPoints,
    format: 'cjs',
    minify: false,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    keepNames: true,
    sourcemap: isDev, // Enable source maps in dev mode for UI-to-code navigation
    outdir: outDir,
    watch: isDev && {
      onRebuild(error, result) {
        if (error) {
          log(chalk.red(`watch build failed: ${error}`));
        } else {
          log(chalk.blue('watch build success:'), result);
          livereload.reload();
        }
      },
    },
    incremental: isDev,
    define: envDefines,
    plugins: [
      sassPlugin({
      quietDeps: true,
      silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      cache: true,
    }),
      ...staticAssets(),
      ...(isDev
        ? [
            codeInspectorPlugin({
              bundler: 'esbuild',
              dev: () => true,
              escapeTags: ['webview'],
              injectTo: [path.resolve('src/app.tsx')],
            }),
          ]
        : []),
    ],
  });

  if (isDev) {
    const serveResult = await esbuild.serve(
      {
        servedir: outDir,
        port: 8080,
      },
      {},
    );
    log(chalk.green(`Listening on ${serveResult.host}:${serveResult.port}`));
    livereload.listen();
  } else {
    const endTime = performance.now();
    const duration = endTime - startTime;
    log(
      chalk.green(`Completed build in ${moment(duration).format('ss.m')}sec`),
    );
  }
};

await runEsbuild();
