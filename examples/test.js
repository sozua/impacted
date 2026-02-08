import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import {
  findImpacted,
  buildDependencyGraph,
  invertGraph,
  createCache,
} from 'impacted';

const base = import.meta.dirname;
const rel = (cwd, files) => files.map((f) => f.replace(cwd + '/', '')).sort();

describe('01-basic-cli', () => {
  const cwd = resolve(base, '01-basic-cli');

  it('math.js impacts math.test.js and format.test.js (transitive)', async (t) => {
    const result = rel(cwd, await findImpacted({
      changedFiles: ['src/math.js'],
      testFiles: 'test/**/*.test.{js,cjs}',
      cwd,
    }));
    t.diagnostic(`src/math.js -> ${result.join(', ')}`);
    assert.deepEqual(result, ['test/format.test.js', 'test/math.test.js']);
  });

  it('legacy.cjs impacts only legacy.test.cjs', async (t) => {
    const result = rel(cwd, await findImpacted({
      changedFiles: ['src/legacy.cjs'],
      testFiles: 'test/**/*.test.{js,cjs}',
      cwd,
    }));
    t.diagnostic(`src/legacy.cjs -> ${result.join(', ')}`);
    assert.deepEqual(result, ['test/legacy.test.cjs']);
  });
});

describe('02-programmatic-api', () => {
  const cwd = resolve(base, '02-programmatic-api');

  it('logger.js impacts logger.test.js and app.test.js (transitive)', async (t) => {
    const result = rel(cwd, await findImpacted({
      changedFiles: ['src/logger.js'],
      testFiles: 'test/**/*.test.js',
      cwd,
    }));
    t.diagnostic(`src/logger.js -> ${result.join(', ')}`);
    assert.deepEqual(result, ['test/app.test.js', 'test/logger.test.js']);
  });

  it('builds and inverts dependency graph', (t) => {
    const testFiles = ['test/logger.test.js', 'test/app.test.js', 'test/health.test.js']
      .map((f) => resolve(cwd, f));

    const graph = buildDependencyGraph(testFiles);
    const inverted = invertGraph(graph);

    t.diagnostic(`graph: ${graph.size} nodes, inverted: ${inverted.size} nodes`);
    assert.equal(graph.size, 5);
    assert.equal(inverted.size, 2);
  });

  it('caching works', async (t) => {
    const cache = createCache();
    await findImpacted({ changedFiles: ['src/logger.js'], testFiles: 'test/**/*.test.js', cwd, cache });

    const stats = cache.stats();
    t.diagnostic(`hits: ${stats.hits}, misses: ${stats.misses}, size: ${stats.size}`);
    assert.equal(stats.hits, 0);
    assert.ok(stats.misses > 0);
    assert.ok(stats.size > 0);
  });
});

describe('03-subpath-imports', () => {
  const cwd = resolve(base, '03-subpath-imports');

  it('utils.js impacts utils.test.js and strings.test.js (transitive via #utils)', async (t) => {
    const result = rel(cwd, await findImpacted({
      changedFiles: ['src/utils.js'],
      testFiles: 'test/**/*.test.js',
      cwd,
    }));
    t.diagnostic(`src/utils.js -> ${result.join(', ')}`);
    assert.deepEqual(result, ['test/strings.test.js', 'test/utils.test.js']);
  });

  it('strings.js impacts only strings.test.js', async (t) => {
    const result = rel(cwd, await findImpacted({
      changedFiles: ['src/lib/strings.js'],
      testFiles: 'test/**/*.test.js',
      cwd,
    }));
    t.diagnostic(`src/lib/strings.js -> ${result.join(', ')}`);
    assert.deepEqual(result, ['test/strings.test.js']);
  });
});

describe('04-test-runners', () => {
  const cwd = resolve(base, '04-test-runners');

  it('calculator.js impacts only calculator.test.js', async (t) => {
    const result = rel(cwd, await findImpacted({
      changedFiles: ['src/calculator.js'],
      testFiles: 'test/**/*.test.js',
      cwd,
    }));
    t.diagnostic(`src/calculator.js -> ${result.join(', ')}`);
    assert.deepEqual(result, ['test/calculator.test.js']);
  });
});
