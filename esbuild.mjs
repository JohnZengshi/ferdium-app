#!/usr/bin/env node
import * as fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as esbuild from 'esbuild';
import { codeInspectorPlugin } from 'code-inspector-plugin';
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

const copyManualAssets = () => {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }
  fs.copyFileSync('package.json', `${outDir}/package.json`);
  fs.copyFileSync('electron-builder.npmrc', `${outDir}/.npmrc`);

  const buildInfoData = {
    timestamp: buildInfo.timestamp,
    gitHashShort: buildInfo.gitHashShort,
    gitBranch: buildInfo.gitBranch,
  };
  fsPkg.outputJsonSync(`${outDir}/buildInfo.json`, buildInfoData);
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
  copyManualAssets();

  // Source files
  const entryPoints = await glob('./src/**/*.{ts,tsx,js,jsx}');

  // Scss entry points
  entryPoints.push(
    'src/styles/main.scss',
    'src/styles/vertical.scss',
    'src/styles/animations.scss',
  );

  // Inject WhatsApp env vars from .env into bundle
  const envDefines = {};
  for (const key of ['WA_AKG_BASE', 'WA_DEFAULT_EMAIL', 'WA_DEFAULT_PASSWORD']) {
    if (process.env[key]) {
      envDefines[`process.env.${key}`] = JSON.stringify(process.env[key]);
    }
  }

  // Run build
  await esbuild.build({
    entryPoints,
    format: 'cjs',
    minify: false,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    keepNames: true,
    sourcemap: isDev,  // Enable source maps in dev mode for UI-to-code navigation
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
      sassPlugin(),
      ...staticAssets(),
      ...(isDev ? [codeInspectorPlugin({ 
        bundler: 'esbuild', 
        dev: () => true,
        escapeTags: ['webview'],  // Exclude webview tags to prevent GUEST_VIEW_MANAGER_CALL errors
      })] : []),
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
