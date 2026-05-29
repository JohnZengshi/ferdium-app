#!/usr/bin/env node
/**
 * merge-graphs.cjs
 *
 * Merges all batch-*.json files, deduplicates nodes/edges,
 * recovers imports from scan-result.json importMap,
 * and writes assembled-graph.json.
 */
const fs = require('fs');
const path = require('path');

const INT_DIR = path.join(__dirname, '..', 'intermediate');
const SCAN_PATH = path.join(INT_DIR, 'scan-result.json');
const OUTPUT_PATH = path.join(INT_DIR, 'assembled-graph.json');

const scan = JSON.parse(fs.readFileSync(SCAN_PATH, 'utf-8'));
const importMap = scan.importMap || {};

// ── Load all batch files ───────────────────────────────────────────────────

const allNodes = [];
const allEdges = [];
let batchCount = 0;

const batchFiles = fs.readdirSync(INT_DIR)
  .filter(f => /^batch-\d+\.json$/.test(f))
  .sort((a, b) => {
    const na = parseInt(a.match(/\d+/)[0], 10);
    const nb = parseInt(b.match(/\d+/)[0], 10);
    return na - nb;
  });

for (const bf of batchFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(INT_DIR, bf), 'utf-8'));
  if (Array.isArray(data.nodes)) allNodes.push(...data.nodes);
  if (Array.isArray(data.edges)) allEdges.push(...data.edges);
  batchCount++;
}

console.log(`Loaded ${batchCount} batch files: ${allNodes.length} nodes, ${allEdges.length} edges`);

// ── Deduplicate nodes (keep last) ──────────────────────────────────────────

const nodesById = new Map();
let dupCount = 0;
for (const node of allNodes) {
  if (node.id) {
    if (nodesById.has(node.id)) dupCount++;
    nodesById.set(node.id, node);
  }
}
if (dupCount > 0) console.log(`Removed ${dupCount} duplicate node IDs`);

// ── Deduplicate edges by (source, target, type) ───────────────────────────

const nodeIds = new Set(nodesById.keys());
const edgeMap = new Map();
let danglingCount = 0;

for (const edge of allEdges) {
  const key = `${edge.source}|${edge.target}|${edge.type}`;
  if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
    danglingCount++;
    continue;
  }
  edgeMap.set(key, edge);
}
if (danglingCount > 0) console.log(`Dropped ${danglingCount} dangling edges`);

// ── Recover import edges from importMap ────────────────────────────────────

const existingPairs = new Set();
for (const edge of edgeMap.values()) {
  if (edge.type === 'imports') {
    existingPairs.add(`${edge.source}|${edge.target}`);
  }
}

// Build a lookup: filePath -> nodeId for all file-level nodes
const pathToNodeId = {};
for (const [id, node] of nodesById) {
  const fp = node.filePath || id.replace(/^(file|config|document|infra|script|markup):/, '');
  pathToNodeId[fp] = id;
}

let recovered = 0;
for (const [sourcePath, targets] of Object.entries(importMap)) {
  const sourceId = pathToNodeId[sourcePath];
  if (!sourceId) continue;

  for (const targetPath of targets) {
    const targetId = pathToNodeId[targetPath];
    if (!targetId) continue;

    const pair = `${sourceId}|${targetId}`;
    if (!existingPairs.has(pair)) {
      edgeMap.set(pair, {
        source: sourceId,
        target: targetId,
        type: 'imports',
        direction: 'forward',
        weight: 0.8,
        description: `Imports ${targetPath} (recovered)`,
      });
      existingPairs.add(pair);
      recovered++;
    }
  }
}
if (recovered > 0) console.log(`Recovered ${recovered} import edges from scan importMap`);

// ── Tag production nodes that have test files ─────────────────────────────
// Simple convention-based test pairing

function isTestPath(fp) {
  const base = fp.split('/').pop() || '';
  return base.includes('.test.') || base.includes('.spec.');
}

// Find test→production pairs
const testNodeIds = [];
for (const [id, node] of nodesById) {
  const fp = node.filePath || '';
  if (isTestPath(fp)) testNodeIds.push(id);
}

let testEdgesAdded = 0;
for (const testId of testNodeIds) {
  const testNode = nodesById.get(testId);
  if (!testNode) continue;
  const testFp = testNode.filePath || '';
  
  // Try to find production counterpart: X.test.ts -> X.ts
  const base = testFp.split('/').pop() || '';
  const prodStem = base.replace(/\.(test|spec)\./, '.');
  const prodFp = testFp.replace(/[^/]+$/, prodStem);
  
  const prodId = pathToNodeId[prodFp];
  if (prodId) {
    const pair = `${prodId}|${testId}`;
    if (!existingPairs.has(pair)) {
      edgeMap.set(pair, {
        source: prodId,
        target: testId,
        type: 'tested_by',
        direction: 'forward',
        weight: 0.5,
        description: 'Path-based pairing (deterministic)',
      });
      existingPairs.add(pair);
      testEdgesAdded++;
      
      // Tag production node as tested
      const prodNode = nodesById.get(prodId);
      if (prodNode) {
        if (!Array.isArray(prodNode.tags)) prodNode.tags = [];
        if (!prodNode.tags.includes('tested')) prodNode.tags.push('tested');
      }
    }
  }
}
if (testEdgesAdded > 0) console.log(`Added ${testEdgesAdded} tested_by edges`);

// ── Write output ───────────────────────────────────────────────────────────

const assembled = {
  nodes: Array.from(nodesById.values()),
  edges: Array.from(edgeMap.values()),
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(assembled, null, 2));
console.log(`Wrote assembled-graph.json: ${assembled.nodes.length} nodes, ${assembled.edges.length} edges`);
