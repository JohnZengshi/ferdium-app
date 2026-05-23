const { buildFingerprintStore, saveFingerprints } = require('C:\\Users\\Administrator\\.opencode\\understand-anything\\understand-anything-plugin\\packages\\core\\dist\\index.js');
const fs = require('fs');
const path = require('path');

const root = 'F:\\project\\work\\ferdium-app';

const graph = JSON.parse(fs.readFileSync(path.join(root, '.understand-anything', 'intermediate', 'assembled-graph.json'), 'utf8'));

const sourceFilePaths = graph.nodes
  .filter(n => n.filePath)
  .map(n => n.filePath);

console.log('Building fingerprints for ' + sourceFilePaths.length + ' files...');

(async () => {
  try {
    const store = await buildFingerprintStore(root, sourceFilePaths);
    saveFingerprints(root, store);
    console.log('Fingerprints saved successfully.');
  } catch (err) {
    console.error('Fingerprint generation failed:', err.message);
    console.log('Continuing without fingerprints.');
  }
})();
