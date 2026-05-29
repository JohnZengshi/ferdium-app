#!/usr/bin/env node
/**
 * create-batches.cjs
 * 
 * Reads scan-result.json and creates batch input files for extract-structure.mjs.
 * Groups files into batches of ~25, preserving import data for each batch.
 */
const fs = require('fs');
const path = require('path');

const scanPath = path.join(__dirname, '..', 'intermediate', 'scan-result.json');
const scan = JSON.parse(fs.readFileSync(scanPath, 'utf-8'));

const allFiles = scan.files || [];
const importMap = scan.importMap || {};

// Only analyze files that have meaningful content (skip 0-line files)
const files = allFiles.filter(f => f.sizeLines > 0 && !f.path.startsWith('.git'));

const BATCH_SIZE = 25;
const batches = [];

for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batchFiles = files.slice(i, i + BATCH_SIZE);
  const batchIndex = batches.length + 1;
  
  // Build import data for this batch
  const batchImportData = {};
  for (const file of batchFiles) {
    if (importMap[file.path]) {
      batchImportData[file.path] = importMap[file.path];
    }
  }
  
  const batchInput = {
    projectRoot: process.cwd(),
    batchFiles: batchFiles.map(f => ({
      path: f.path,
      language: f.language,
      sizeLines: f.sizeLines,
      fileCategory: f.fileCategory,
    })),
    batchImportData,
  };
  
  const inputPath = path.join(__dirname, `batch-${batchIndex}-input.json`);
  fs.writeFileSync(inputPath, JSON.stringify(batchInput, null, 2));
  
  batches.push(batchIndex);
}

console.log(JSON.stringify({
  totalFiles: files.length,
  totalBatches: batches.length,
  batchSize: BATCH_SIZE,
  batches,
}));
