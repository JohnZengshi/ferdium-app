const fs = require('fs');
const path = require('path');
const root = 'F:\\project\\work\\ferdium-app';

const graph = JSON.parse(fs.readFileSync(path.join(root, '.understand-anything', 'intermediate', 'assembled-graph.json'), 'utf8'));

// Get git commit hash
const { execSync } = require('child_process');
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch (e) { /* not a git repo */ }

// Build the final KnowledgeGraph object
const knowledgeGraph = {
  version: "1.0.0",
  project: {
    name: "ferdium",
    languages: ["typescript", "javascript", "markdown", "yaml", "json", "shell", "powershell", "dockerfile", "css", "scss", "html", "python", "xml"],
    frameworks: ["React", "MobX", "Electron", "MUI", "AdonisJS", "Emotion", "esbuild", "Jest", "ESLint", "Biome", "Prettier"],
    description: "Ferdium is a desktop app that helps you organize how you use your favourite apps by combining them into one application.",
    analyzedAt: new Date().toISOString(),
    gitCommitHash: commitHash
  },
  nodes: graph.nodes,
  edges: graph.edges,
  layers: graph.layers,
  tour: graph.tour
};

// Write final knowledge graph
fs.writeFileSync(path.join(root, '.understand-anything', 'knowledge-graph.json'), JSON.stringify(knowledgeGraph, null, 2));
console.log('Written: .understand-anything/knowledge-graph.json');
console.log('  Nodes:', graph.nodes.length);
console.log('  Edges:', graph.edges.length);
console.log('  Layers:', graph.layers.length);
console.log('  Tour steps:', graph.tour.length);

// Write meta
const meta = {
  lastAnalyzedAt: new Date().toISOString(),
  gitCommitHash: commitHash,
  version: "1.0.0",
  analyzedFiles: graph.nodes.length
};
fs.writeFileSync(path.join(root, '.understand-anything', 'meta.json'), JSON.stringify(meta, null, 2));
console.log('Written: .understand-anything/meta.json');
