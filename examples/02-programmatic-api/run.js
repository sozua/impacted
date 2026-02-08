import { resolve } from 'node:path';
import {
  findImpacted,
  buildDependencyGraph,
  invertGraph,
  createCache,
} from 'impacted';

const useCache = process.argv.includes('--cache');
const cwd = resolve(import.meta.dirname);

// --- 1. High-level API: findImpacted() ---
console.log('=== findImpacted() ===\n');

const changedFiles = ['src/logger.js'];
console.log('Changed files:', changedFiles);

const impacted = await findImpacted({
  changedFiles,
  testFiles: 'test/**/*.test.js',
  cwd,
});

console.log('Impacted tests:');
for (const file of impacted) {
  console.log(' ', file);
}

// --- 2. Lower-level: buildDependencyGraph() ---
console.log('\n=== buildDependencyGraph() ===\n');

const testFiles = [
  resolve(cwd, 'test/logger.test.js'),
  resolve(cwd, 'test/app.test.js'),
  resolve(cwd, 'test/health.test.js'),
];

const graph = buildDependencyGraph(testFiles);

console.log('Dependency graph (file -> imports):');
for (const [file, deps] of graph) {
  const short = file.replace(cwd + '/', '');
  const shortDeps = [...deps].map((d) => d.replace(cwd + '/', ''));
  if (shortDeps.length > 0) {
    console.log(`  ${short} -> ${shortDeps.join(', ')}`);
  }
}

// --- 3. invertGraph() ---
console.log('\n=== invertGraph() ===\n');

const inverted = invertGraph(graph);

console.log('Inverted graph (file -> depended on by):');
for (const [file, dependents] of inverted) {
  const short = file.replace(cwd + '/', '');
  const shortDeps = [...dependents].map((d) => d.replace(cwd + '/', ''));
  console.log(`  ${short} <- ${shortDeps.join(', ')}`);
}

// --- 4. Caching ---
if (useCache) {
  console.log('\n=== createCache() ===\n');

  const cache = createCache({ cacheFile: resolve(cwd, '.impacted-cache.json') });

  const impactedCached = await findImpacted({
    changedFiles,
    testFiles: 'test/**/*.test.js',
    cwd,
    cache,
  });

  cache.save();

  const stats = cache.stats();
  console.log('Cache stats:', stats);
  console.log('Impacted (cached):', impactedCached.length, 'test(s)');
  console.log('\nRun again to see cache hits increase.');
}
