#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const recipesDir = resolve(import.meta.dirname, '..', 'recipes');

function run(desc, command, cwd = process.cwd()) {
  console.log(`[${desc}]`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
  console.log('');
}

console.log('========================================');
console.log('  Ferdium Recipes Setup');
console.log('========================================\n');

// Step 1: Pull git submodule
run(
  '1/3] Updating git submodules',
  'git submodule update --init --recursive --remote',
);

// Step 2: Install recipe dependencies
if (existsSync(join(recipesDir, 'package.json'))) {
  run(
    '2/3] Installing recipe dependencies',
    'pnpm install --config.engine-strict=false',
    recipesDir,
  );
} else {
  console.error(
    'ERROR: recipes/package.json not found. Is the submodule initialized?',
  );
  process.exit(1);
}

// Step 3: Package recipes
run('3/3] Packaging recipes', 'node scripts/package.js', recipesDir);

console.log('========================================');
console.log('  Recipes setup complete!');
console.log('========================================');
