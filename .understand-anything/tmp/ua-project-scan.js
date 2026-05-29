const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// === Helpers ===
function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function resolveProjectPath(rel) {
  return path.resolve(projectRoot, normalizePath(rel).replace(/\//g, path.sep));
}

// === Init ===
if (process.argv.length < 4) {
  console.error('Usage: node scan.js <project-root> <output-path>');
  process.exit(1);
}

const projectRoot = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);

if (!fs.existsSync(projectRoot)) {
  console.error(`Project root not found: ${projectRoot}`);
  process.exit(1);
}

console.error(`Scanning: ${projectRoot}`);
console.error(`Output: ${outputPath}`);

// === Step 1: File Discovery ===
function discoverFiles() {
  try {
    const result = execSync('git ls-files', {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return result.split('\n').filter(f => f.trim()).map(f => normalizePath(f.trim()));
  } catch (err) {
    console.error('git ls-files failed, falling back to walk:', err.message);
    const files = [];
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = normalizePath(path.relative(projectRoot, full));
        if (entry.isDirectory()) {
          if (/^(\.git|node_modules)$/.test(entry.name) || rel.includes('/node_modules/') || rel.includes('/.git/')) continue;
          walk(full);
        } else {
          files.push(rel);
        }
      }
    };
    walk(projectRoot);
    return files;
  }
}

// === Step 2: Exclusion Filtering ===
const DEFAULT_EXCLUDE = [
  f => /\/node_modules\//.test(f) || f.startsWith('node_modules/'),
  f => /\/\.git\//.test(f) || f.startsWith('.git/'),
  f => /\/vendor\//.test(f) || f.startsWith('vendor/'),
  f => /\/venv\//.test(f) || f.startsWith('venv/'),
  f => /\/\.venv\//.test(f) || f.startsWith('.venv/'),
  f => /\/__pycache__\//.test(f) || f.startsWith('__pycache__/'),
  f => /(\/|^)(dist|build|out|coverage|\.next|\.cache|\.turbo|target|obj)\//.test(f),
  f => f.endsWith('.lock'),
  f => f === 'package-lock.json' || f === 'yarn.lock' || f === 'pnpm-lock.yaml',
  f => /\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|mp[34]|pdf|zip|tar\.gz|tgz)$/i.test(f),
  f => f.endsWith('.min.js') || f.endsWith('.min.css') || f.endsWith('.map') || f.includes('.generated.'),
  f => /\/\.idea\//.test(f) || /\/\.vscode\//.test(f),
  f => path.basename(f) === 'LICENSE',
  f => path.basename(f) === '.gitignore' || path.basename(f) === '.editorconfig' || path.basename(f) === '.prettierrc',
  f => /^\.eslintrc/.test(path.basename(f)),
  f => f.endsWith('.log'),
];

function parseIgnorePatterns(content) {
  const patterns = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const negate = t.startsWith('!');
    const p = negate ? t.slice(1).trim() : t;
    const isDir = p.endsWith('/');
    const cp = isDir ? p.slice(0, -1) : p;
    let reStr = '^';
    for (let i = 0; i < cp.length; i++) {
      const c = cp[i];
      if (c === '*') {
        if (i + 1 < cp.length && cp[i + 1] === '*') {
          reStr += '.*';
          i++;
          if (i + 1 < cp.length && (cp[i + 1] === '/' || cp[i + 1] === '\\')) i++;
        } else {
          reStr += '[^/]*';
        }
      } else if (c === '?') {
        reStr += '[^/]';
      } else if (c === '.') {
        reStr += '\\.';
      } else if (c === '/' || c === '\\') {
        reStr += '[/\\\\]';
      } else {
        reStr += c;
      }
    }
    if (isDir) reStr += '(/.*)?';
    reStr += '$';
    patterns.push({ regex: new RegExp(reStr, 'i'), negate });
  }
  return patterns;
}

function matchesGitignore(f, patterns) {
  for (const { regex, negate } of patterns) {
    if (regex.test(f)) return !negate;
  }
  return false;
}

// === Step 3-4: Language & Category Detection ===
const EXT_LANG = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.rb': 'ruby',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
  '.c': 'c', '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin', '.php': 'php',
  '.sh': 'shell', '.bash': 'shell', '.ps1': 'powershell', '.bat': 'batch', '.cmd': 'batch',
  '.md': 'markdown', '.rst': 'markdown',
  '.yaml': 'yaml', '.yml': 'yaml', '.json': 'json', '.jsonc': 'jsonc', '.toml': 'toml',
  '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql', '.proto': 'protobuf',
  '.tf': 'terraform', '.tfvars': 'terraform',
  '.html': 'html', '.htm': 'html', '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
  '.xml': 'xml', '.cfg': 'config', '.ini': 'config', '.env': 'config',
};

const NAMED_LANG = {
  'Dockerfile': 'dockerfile', 'Makefile': 'makefile', 'Jenkinsfile': 'jenkinsfile',
  'Procfile': 'procfile', 'Vagrantfile': 'vagrantfile',
};

function detectLanguage(f) {
  const bn = path.basename(f);
  if (NAMED_LANG[bn]) return NAMED_LANG[bn];
  const ext = path.extname(f).toLowerCase();
  return EXT_LANG[ext] || ext.slice(1) || 'unknown';
}

function detectCategory(f, lang) {
  const bn = path.basename(f);
  const ext = path.extname(f).toLowerCase();
  if (['.md', '.rst'].includes(ext) || (ext === '.txt' && bn !== 'LICENSE')) return 'docs';
  if (['.yaml', '.yml', '.json', '.jsonc', '.toml', '.xml', '.cfg', '.ini'].includes(ext) || bn === '.env' || bn === '.env.example') return 'config';
  if (bn === 'Dockerfile' || bn.startsWith('docker-compose.') || ext === '.tf' || ext === '.tfvars' || bn === 'Makefile' || bn === 'Jenkinsfile' || f.includes('.github/workflows/')) return 'infra';
  if (['.sql', '.graphql', '.gql', '.proto', '.prisma'].includes(ext)) return 'data';
  if (['.sh', '.bash', '.ps1', '.bat', '.cmd'].includes(ext)) return 'script';
  if (['.html', '.htm', '.css', '.scss', '.sass', '.less'].includes(ext)) return 'markup';
  return 'code';
}

// === Step 5: Line Counting ===
function batchCountLines(filePaths) {
  const counts = {};
  const BATCH = 500;
  for (let i = 0; i < filePaths.length; i += BATCH) {
    const batch = filePaths.slice(i, i + BATCH);
    for (const absPath of batch) {
      try {
        const content = fs.readFileSync(absPath, 'utf8');
        counts[absPath] = content.split('\n').length;
      } catch {
        counts[absPath] = 0;
      }
    }
  }
  return counts;
}

// === Step 6: Framework Detection ===
function detectFrameworks(pkg) {
  const fws = new Set();
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const names = Object.keys(deps);
  const map = [
    ['react', 'React'], ['next', 'Next.js'], ['vue', 'Vue.js'], ['svelte', 'Svelte'],
    ['@angular/core', 'Angular'], ['express', 'Express'], ['vite', 'Vite'],
    ['vitest', 'Vitest'], ['jest', 'Jest'], ['mocha', 'Mocha'],
    ['tailwindcss', 'Tailwind CSS'], ['redux', 'Redux'], ['zustand', 'Zustand'],
    ['mobx', 'MobX'], ['mobx-react', 'MobX'], ['electron', 'Electron'],
    ['@adonisjs/core', 'AdonisJS'], ['typeorm', 'TypeORM'], ['prisma', 'Prisma'],
    ['graphql', 'GraphQL'], ['apollo-server', 'Apollo'], ['eslint', 'ESLint'],
    ['prettier', 'Prettier'], ['biome', 'Biome'],
    ['@emotion/react', 'Emotion'], ['@mui/material', 'MUI'],
    ['webpack', 'Webpack'], ['esbuild', 'esbuild'], ['typescript', 'TypeScript'],
  ];
  for (const n of names) {
    for (const [key, fw] of map) {
      if (n === key || n.startsWith(key + '/') || (n.startsWith('@' + key + '/'))) {
        fws.add(fw);
      }
    }
  }
  return [...fws].sort();
}

// === Step 9: Import Resolution ===
const IMPORT_RE = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
const EXT_VARIANTS = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

function resolveImport(imprt, srcRelPath, allFilesSet, tsPaths) {
  if (!imprt) return null;

  // Bare package (no leading . or /) - check tsconfig path aliases
  if (!imprt.startsWith('.') && !imprt.startsWith('/')) {
    for (const [alias, aliasTargets] of Object.entries(tsPaths)) {
      const aliasKey = alias.replace('/*', '');
      const aliasRegex = new RegExp('^' + aliasKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/(.+)$');
      const match = imprt.match(aliasRegex);
      if (match) {
        const rest = match[1];
        for (const target of aliasTargets) {
          const targetBase = target.replace('/*', '');
          const candidate = targetBase + '/' + rest;
          for (const variant of EXT_VARIANTS) {
            const testPath = normalizePath(candidate + variant);
            if (allFilesSet.has(testPath)) return testPath;
          }
        }
      }
    }
    return null;
  }

  // Relative or absolute path import resolution
  const srcDir = path.dirname(srcRelPath);
  const resolved = normalizePath(path.join(srcDir, imprt));

  // Direct match or try extension variants
  if (allFilesSet.has(resolved)) return resolved;
  for (const variant of EXT_VARIANTS) {
    const testPath = resolved + variant;
    if (allFilesSet.has(testPath)) return testPath;
  }

  return null;
}

function buildImportMap(codeFiles, allFilesSet, tsPaths) {
  const map = {};
  for (const relPath of codeFiles) {
    const absPath = resolveProjectPath(relPath);
    const imports = [];
    try {
      const content = fs.readFileSync(absPath, 'utf8');
      let m;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(content)) !== null) {
        const imp = m[1] || m[2] || m[3];
        if (!imp) continue;
        const resolved = resolveImport(imp, relPath, allFilesSet, tsPaths);
        if (resolved) imports.push(normalizePath(resolved));
      }
    } catch {}
    map[relPath] = [...new Set(imports)].sort();
  }
  return map;
}

// === Read package.json ===
function readPackageJson() {
  try {
    const p = path.join(projectRoot, 'package.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return {};
}

function readTsconfigPaths() {
  try {
    const p = path.join(projectRoot, 'tsconfig.json');
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      return cfg.compilerOptions?.paths || {};
    }
  } catch {}
  return {};
}

// === MAIN ===
try {
  // Step 1: Discover files
  const allFiles = discoverFiles();
  console.error(`Discovered ${allFiles.length} files`);

  // Step 2: Apply default exclusions
  let files = applyExclusions(allFiles);
  console.error(`After default exclusions: ${files.length} files`);

  // Step 2.5: Read and apply .understandignore
  let filteredByIgnore = 0;
  const ignorePath = path.join(projectRoot, '.understand-anything', '.understandignore');
  if (fs.existsSync(ignorePath)) {
    const ignoreContent = fs.readFileSync(ignorePath, 'utf8');
    const ignorePatterns = parseIgnorePatterns(ignoreContent);
    if (ignorePatterns.length > 0) {
      const activePatterns = ignorePatterns.filter(p => !p.negate && p.regex);
      if (activePatterns.length > 0) {
        const before = files.length;
        files = files.filter(f => !matchesGitignore(f, ignorePatterns));
        filteredByIgnore = before - files.length;
        console.error(`After .understandignore: ${files.length} files (filtered: ${filteredByIgnore})`);
      }
    }
  } else {
    console.error('No .understandignore found');
  }

  // Read package.json
  const pkg = readPackageJson();
  const projectName = pkg.name || path.basename(projectRoot);
  const rawDescription = pkg.description || '';

  // Process files
  const fileResults = [];
  const codeRelPaths = [];
  const absPaths = [];
  const allFilesSet = new Set(files);

  for (const relPath of files) {
    const lang = detectLanguage(relPath);
    const cat = detectCategory(relPath, lang);
    const absPath = resolveProjectPath(relPath);
    absPaths.push(absPath);
    fileResults.push({ path: relPath, language: lang, fileCategory: cat });
    if (cat === 'code') {
      codeRelPaths.push(relPath);
    }
  }

  // Step 5: Count lines
  console.error(`Counting lines for ${absPaths.length} files...`);
  const lineCounts = batchCountLines(absPaths);
  for (const fr of fileResults) {
    const absPath = resolveProjectPath(fr.path);
    fr.sizeLines = lineCounts[absPath] || 0;
  }
  console.error('Line counting complete');

  // Step 6: Detect frameworks
  const frameworks = detectFrameworks(pkg);
  
  // Add infrastructure-based frameworks
  const allPaths = new Set(files);
  if ([...allPaths].some(f => path.basename(f) === 'Dockerfile')) frameworks.push('Docker');
  if ([...allPaths].some(f => f.startsWith('docker-compose.') || f.includes('/docker-compose.'))) frameworks.push('Docker Compose');
  if ([...allPaths].some(f => f.includes('.github/workflows/'))) frameworks.push('GitHub Actions');

  // Step 7: Complexity
  const count = files.length;
  let estimatedComplexity;
  if (count <= 30) estimatedComplexity = 'small';
  else if (count <= 150) estimatedComplexity = 'moderate';
  else if (count <= 500) estimatedComplexity = 'large';
  else estimatedComplexity = 'very-large';

  // Step 8: Languages list
  const langSet = new Set(fileResults.map(f => f.language));

  // Step 9: Import resolution
  console.error(`Resolving imports for ${codeRelPaths.length} code files...`);
  const tsPaths = readTsconfigPaths();
  const importMap = buildImportMap(codeRelPaths, allFilesSet, tsPaths);
  console.error('Import resolution complete');

  // Read first 10 lines of README
  let readmeHead = '';
  try {
    const readmePath = path.join(projectRoot, 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    readmeHead = readmeContent.split('\n').slice(0, 10).join('\n').trim();
  } catch {}

  // Build output
  const output = {
    scriptCompleted: true,
    name: projectName,
    rawDescription,
    readmeHead,
    languages: [...langSet].sort(),
    frameworks: [...new Set(frameworks)].sort(),
    files: fileResults,
    totalFiles: count,
    filteredByIgnore,
    estimatedComplexity,
    importMap,
  };

  // Write output
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.error(`Scan results written to ${outputPath}`);
  process.exit(0);

} catch (err) {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
}

// === Apply Exclusions Function ===
function applyExclusions(files) {
  return files.filter(f => !DEFAULT_EXCLUDE.some(pattern => pattern(f)));
}
