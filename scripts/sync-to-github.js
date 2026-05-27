#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sync local code to GitHub remote (JohnZengshi/ferdium-app).
 *
 * Usage:
 *   node scripts/sync-to-github.js
 *   node scripts/sync-to-github.js --branch whatsapp-ai-automation
 *   node scripts/sync-to-github.js --force
 *   node scripts/sync-to-github.js -u
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const REMOTE_NAME = 'github';
const REMOTE_URL = 'https://github.com/JohnZengshi/ferdium-app.git';

// ── Parse args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const branchArgIdx = args.indexOf('--branch');
const branch = branchArgIdx === -1 ? null : args[branchArgIdx + 1];
const force = args.includes('--force');
const setUpstream = args.includes('-u');

// ── Repo root ───────────────────────────────────────────────
const repoRoot = path.resolve(__dirname, '..');

function git(...gitArgs) {
  return execFileSync('git', gitArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function log(msg, color = '') {
  const colors = {
    cyan: '\u001B[36m',
    green: '\u001B[32m',
    yellow: '\u001B[33m',
    red: '\u001B[31m',
    reset: '\u001B[0m',
  };
  const prefix = colors[color] || '';
  const suffix = prefix ? colors.reset : '';
  console.log(`${prefix}${msg}${suffix}`);
}

function hr() {
  console.log('═'.repeat(50));
}

// ── Main ────────────────────────────────────────────────────
try {
  hr();
  log('  Sync to GitHub (JohnZengshi/ferdium-app)', 'cyan');
  hr();

  // 1. Resolve branch
  const currentBranch = branch || git('rev-parse', '--abbrev-ref', 'HEAD');
  log(`  Target branch: ${currentBranch}`, 'yellow');

  // 2. Ensure remote exists
  const remotes = git('remote');
  if (remotes.split('\n').includes(REMOTE_NAME)) {
    const currentUrl = git('remote', 'get-url', REMOTE_NAME);
    if (currentUrl === REMOTE_URL) {
      log(`  Remote '${REMOTE_NAME}' already configured`, 'green');
    } else {
      log(`  Updating remote URL: ${currentUrl} → ${REMOTE_URL}`, 'yellow');
      git('remote', 'set-url', REMOTE_NAME, REMOTE_URL);
    }
  } else {
    log(`  Adding remote '${REMOTE_NAME}' → ${REMOTE_URL}`, 'green');
    git('remote', 'add', REMOTE_NAME, REMOTE_URL);
  }

  // 3. Push
  const pushArgs = [REMOTE_NAME, `HEAD:${currentBranch}`];
  if (force) pushArgs.push('--force');
  if (setUpstream) pushArgs.push('-u');

  log(`  Pushing → ${REMOTE_NAME}/${currentBranch} ...`, 'cyan');
  const output = git('push', ...pushArgs);
  console.log(output);
  log(`  ✓ Synced to GitHub: ${REMOTE_NAME}/${currentBranch}`, 'green');
  hr();
} catch (error) {
  log(`  ✗ Failed: ${error.message}`, 'red');
  if (error.stderr) {
    const hints = error.stderr.replaceAll(/^/gm, '    ').trim();
    if (hints) console.error(hints);
  }
  log('', 'reset');
  log('  Tip: set up authentication via:', 'yellow');
  log(
    '    git remote set-url github https://<token>@github.com/JohnZengshi/ferdium-app.git',
    'yellow',
  );
  log(
    '    git remote set-url github git@github.com:JohnZengshi/ferdium-app.git',
    'yellow',
  );
  process.exit(1);
}
