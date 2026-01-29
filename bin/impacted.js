#!/usr/bin/env node

import { findImpacted } from '../src/index.js';

const args = process.argv.slice(2);

// Parse -p/--pattern flag
let pattern = '**/*.test.js';
const patternIndex = args.findIndex((arg) => arg === '-p' || arg === '--pattern');
if (patternIndex !== -1 && args[patternIndex + 1]) {
  pattern = args[patternIndex + 1];
}

// Read changed files from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on('end', async () => {
  const changedFiles = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (changedFiles.length === 0) {
    process.exit(0);
  }

  const impacted = await findImpacted({
    changedFiles,
    testFiles: pattern,
  });

  for (const file of impacted) {
    console.log(file);
  }
});
