import { buildFingerprintStore, saveFingerprints } from '@understand-anything/core';
import { readFileSync } from 'fs';
import path from 'path';

const root = 'F:\\project\\work\\ferdium-app';

// Get all source file paths from the assembled graph
const graph = JSON.parse(readFileSync(
  path.join(root, '.understand-anything', 'intermediate', 'assembled-graph.json'), 'utf8'));

const sourceFilePaths = graph.nodes
  .filter(n => n.filePath)
  .map(n => n.filePath);

console.log(`Building fingerprints for ${sourceFilePaths.length} files...`);

try {
  const store = await buildFingerprintStore(root, sourceFilePaths);
  saveFingerprints(root, store);
  console.log('Fingerprints saved successfully.');
} catch (err) {
  console.error('Fingerprint generation failed:', err.message);
  console.log('Continuing without fingerprints (incremental updates will not be available).');
}
