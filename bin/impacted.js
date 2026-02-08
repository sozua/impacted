#!/usr/bin/env node

import { findImpacted } from '../src/index.js';

const args = process.argv.slice(2);

// Parse -p/--pattern flags (supports multiple: -p "*.test.js" -p "*.spec.js")
const patterns = [];
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-p' || args[i] === '--pattern') && args[i + 1]) {
    patterns.push(args[++i]);
  }
}
const pattern = patterns.length > 0 ? patterns : '**/*.{test,spec}.{js,mjs,cjs,jsx}';

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
