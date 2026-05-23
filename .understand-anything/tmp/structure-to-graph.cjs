#!/usr/bin/env node
/**
 * structure-to-graph.cjs
 *
 * Reads structural extraction results from all batches and converts
 * to GraphNode/GraphEdge format for merge-batch-graphs.py.
 * 
 * Produces file-level nodes with auto-generated tags, summaries, and complexity.
 * The merge script handles import edges via recover_imports_from_scan().
 */
const fs = require('fs');
const path = require('path');

const TMP_DIR = path.join(__dirname);
const INT_DIR = path.join(__dirname, '..', 'intermediate');
const SCAN_PATH = path.join(__dirname, '..', 'intermediate', 'scan-result.json');

const scan = JSON.parse(fs.readFileSync(SCAN_PATH, 'utf-8'));
const importMap = scan.importMap || {};

function determineType(fc) {
  return { code:'file', config:'config', docs:'document', infra:'infra', script:'script', markup:'markup' }[fc] || 'file';
}

function determinePrefix(type) {
  return { file:'file', config:'config', document:'document', infra:'infra', script:'script', markup:'markup' }[type] || 'file';
}

function computeComplexity(lines) {
  if (lines <= 20) return 'simple';
  if (lines <= 100) return 'moderate';
  return 'complex';
}

function makeNodeName(fp) { return fp.split('/').pop() || fp; }

function generateTags(r) {
  const tags = [r.language];
  const segs = r.path.split('/');
  if (segs.length >= 2) {
    if (segs[0] === 'src') { tags.push('source'); if (segs.length >= 3) tags.push('src:' + segs[1]); }
    else tags.push(segs[0]);
  }
  if (r.functions && r.functions.length > 0) tags.push('has-functions');
  if (r.classes && r.classes.length > 0) tags.push('has-classes');
  if (r.exports && r.exports.length > 0) tags.push('has-exports');
  if (r.path.endsWith('.tsx') || r.path.endsWith('.jsx')) tags.push('react-component');
  if ((r.path.split('/').pop() || '').includes('.test.') || (r.path.split('/').pop() || '').includes('.spec.')) tags.push('test-file');
  return [...new Set(tags)];
}

function generateSummary(r) {
  const t = determineType(r.fileCategory);
  if (t !== 'file') return `${t.charAt(0).toUpperCase() + t.slice(1)}: ${r.path}`;
  const parts = [];
  if (r.classes && r.classes.length > 0) parts.push('Defines ' + r.classes.map(c => c.name).join(', '));
  if (r.exports && r.exports.length > 0) {
    const named = r.exports.filter(e => !e.isDefault).map(e => e.name);
    if (named.length > 0) parts.push('Exports ' + named.join(', '));
  }
  if (r.functions && r.functions.length > 0 && parts.length === 0) parts.push('Defines ' + r.functions.length + ' functions');
  if (r.endpoints && r.endpoints.length > 0) parts.push('Defines ' + r.endpoints.length + ' endpoints');
  return parts.length > 0 ? parts.join('. ') + '.' : `Source file: ${r.path}`;
}

// Process all 20 batches
for (let i = 1; i <= 20; i++) {
  const structPath = path.join(TMP_DIR, `batch-${i}-structure.json`);
  if (!fs.existsSync(structPath)) continue;
  const data = JSON.parse(fs.readFileSync(structPath, 'utf-8'));
  const nodes = [];
  const edges = [];
  const batchPaths = new Set(data.results.map(r => r.path));

  for (const result of data.results) {
    const type = determineType(result.fileCategory);
    const prefix = determinePrefix(type);
    const id = `${prefix}:${result.path}`;
    nodes.push({
      id, type,
      name: makeNodeName(result.path),
      filePath: result.path,
      summary: generateSummary(result),
      tags: generateTags(result),
      complexity: computeComplexity(result.totalLines),
      language: result.language,
      sizeLines: result.totalLines,
    });

    // Intra-batch import edges
    const imports = importMap[result.path] || [];
    for (const target of imports) {
      if (batchPaths.has(target)) {
        const tf = (scan.files || []).find(f => f.path === target);
        const tp = determinePrefix(determineType(tf ? tf.fileCategory : 'code'));
        edges.push({
          source: id, target: `${tp}:${target}`,
          type: 'imports', direction: 'forward', weight: 1.0,
          description: `Imports ${target}`,
        });
      }
    }
  }

  const outPath = path.join(INT_DIR, `batch-${i}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ nodes, edges }, null, 2));
  console.log(`Batch ${i}: ${nodes.length} nodes, ${edges.length} edges`);
}
console.log('All batches converted.');
