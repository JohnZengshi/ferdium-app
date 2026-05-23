const fs = require('fs');
const path = require('path');
const content = fs.readFileSync('F:/project/work/ferdium-app/src/index.ts', 'utf8');
const re = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
let m;
let count = 0;
while ((m = re.exec(content)) !== null) {
  const imp = m[1] || m[2] || m[3];
  if (imp) { console.log('Import:', imp); count++; }
}
console.log('Total imports found:', count);
