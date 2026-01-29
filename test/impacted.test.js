import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlinkSync, existsSync } from 'node:fs';
import { findImpacted, buildDependencyGraph, parseImports, resolveSpecifier, createCache } from '../src/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixtures = join(__dirname, 'fixtures');
const subpathFixtures = join(fixtures, 'subpath');

describe('parseImports', () => {
  test('parses CJS require', () => {
    const source = `const { foo } = require('./foo.js');`;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, ['./foo.js']);
  });

  test('parses ESM import', () => {
    const source = `import { foo } from './foo.js';`;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, ['./foo.js']);
  });

  test('parses dynamic import', () => {
    const source = `const mod = await import('./foo.js');`;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, ['./foo.js']);
  });

  test('parses export * from', () => {
    const source = `export * from './foo.js';`;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, ['./foo.js']);
  });

  test('parses export { x } from', () => {
    const source = `export { bar as baz } from './foo.js';`;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, ['./foo.js']);
  });

  test('handles multiple imports', () => {
    const source = `
      const a = require('./a.js');
      import b from './b.js';
      export * from './c.js';
    `;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, ['./a.js', './b.js', './c.js']);
  });

  test('returns empty array for invalid syntax', () => {
    const source = `this is not valid javascript {{{`;
    const imports = parseImports(source);
    assert.deepStrictEqual(imports, []);
  });
});

describe('buildDependencyGraph', () => {
  test('builds graph from test files', () => {
    const testFiles = [
      join(fixtures, 'affected.test.cjs'),
      join(fixtures, 'unaffected.test.cjs'),
    ];
    const graph = buildDependencyGraph(testFiles);

    assert(graph.has(join(fixtures, 'affected.test.cjs')));
    assert(graph.has(join(fixtures, 'unaffected.test.cjs')));

    const affectedDeps = graph.get(join(fixtures, 'affected.test.cjs'));
    assert(affectedDeps.has(join(fixtures, 'source.cjs')));
  });

  test('follows transitive dependencies', () => {
    const testFiles = [join(fixtures, 'indirect.test.cjs')];
    const graph = buildDependencyGraph(testFiles);

    // indirect.test.cjs -> helper.cjs -> source.cjs
    assert(graph.has(join(fixtures, 'indirect.test.cjs')));
    assert(graph.has(join(fixtures, 'helper.cjs')));
    assert(graph.has(join(fixtures, 'source.cjs')));
  });
});

describe('findImpacted', () => {
  test('finds directly impacted tests', async () => {
    const impacted = await findImpacted({
      changedFiles: [join(fixtures, 'source.cjs')],
      testFiles: [
        join(fixtures, 'affected.test.cjs'),
        join(fixtures, 'unaffected.test.cjs'),
      ],
      cwd: fixtures,
    });

    assert(impacted.includes(join(fixtures, 'affected.test.cjs')));
    assert(!impacted.includes(join(fixtures, 'unaffected.test.cjs')));
  });

  test('finds transitively impacted tests', async () => {
    const impacted = await findImpacted({
      changedFiles: [join(fixtures, 'source.cjs')],
      testFiles: [
        join(fixtures, 'affected.test.cjs'),
        join(fixtures, 'indirect.test.cjs'),
        join(fixtures, 'unaffected.test.cjs'),
      ],
      cwd: fixtures,
    });

    assert(impacted.includes(join(fixtures, 'affected.test.cjs')));
    assert(impacted.includes(join(fixtures, 'indirect.test.cjs')));
    assert(!impacted.includes(join(fixtures, 'unaffected.test.cjs')));
  });

  test('includes test file when it is directly changed', async () => {
    const impacted = await findImpacted({
      changedFiles: [join(fixtures, 'unaffected.test.cjs')],
      testFiles: [
        join(fixtures, 'affected.test.cjs'),
        join(fixtures, 'unaffected.test.cjs'),
      ],
      cwd: fixtures,
    });

    assert(impacted.includes(join(fixtures, 'unaffected.test.cjs')));
    assert(!impacted.includes(join(fixtures, 'affected.test.cjs')));
  });

  test('works with glob patterns', async () => {
    const impacted = await findImpacted({
      changedFiles: ['source.cjs'],
      testFiles: '*.test.cjs',
      cwd: fixtures,
    });

    assert(impacted.some((f) => f.endsWith('affected.test.cjs')));
    assert(impacted.some((f) => f.endsWith('indirect.test.cjs')));
    assert(!impacted.some((f) => f.endsWith('unaffected.test.cjs')));
  });

  test('returns empty array when no changed files', async () => {
    const impacted = await findImpacted({
      changedFiles: [],
      testFiles: [join(fixtures, 'affected.test.cjs')],
    });

    assert.deepStrictEqual(impacted, []);
  });
});

describe('subpath imports (#imports)', () => {
  test('resolves direct subpath import', () => {
    const parentPath = join(subpathFixtures, 'app.test.js');
    const resolved = resolveSpecifier('#utils', parentPath);
    assert.strictEqual(resolved, join(subpathFixtures, 'src/utils.js'));
  });

  test('resolves wildcard subpath import', () => {
    const parentPath = join(subpathFixtures, 'app.test.js');
    const resolved = resolveSpecifier('#lib/math', parentPath);
    assert.strictEqual(resolved, join(subpathFixtures, 'src/lib/math.js'));
  });

  test('builds graph with subpath imports', () => {
    const testFiles = [join(subpathFixtures, 'app.test.js')];
    const graph = buildDependencyGraph(testFiles);

    assert(graph.has(join(subpathFixtures, 'app.test.js')));

    const deps = graph.get(join(subpathFixtures, 'app.test.js'));
    assert(deps.has(join(subpathFixtures, 'src/utils.js')));
    assert(deps.has(join(subpathFixtures, 'src/lib/math.js')));
  });

  test('finds impacted tests via subpath imports', async () => {
    const impacted = await findImpacted({
      changedFiles: [join(subpathFixtures, 'src/utils.js')],
      testFiles: [join(subpathFixtures, 'app.test.js')],
    });

    assert(impacted.includes(join(subpathFixtures, 'app.test.js')));
  });
});

describe('caching', () => {
  test('cache stores and retrieves imports', () => {
    const cache = createCache();
    const filePath = join(fixtures, 'source.cjs');

    // First access should miss
    assert.strictEqual(cache.get(filePath), null);

    // Store imports
    cache.set(filePath, ['./dep1.js', './dep2.js']);

    // Second access should hit
    const cached = cache.get(filePath);
    assert.deepStrictEqual(cached, ['./dep1.js', './dep2.js']);

    const stats = cache.stats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
  });

  test('buildDependencyGraph uses cache', () => {
    const cache = createCache();
    const testFiles = [join(fixtures, 'affected.test.cjs')];

    // First build populates cache
    buildDependencyGraph(testFiles, { cache });
    const statsAfterFirst = cache.stats();

    // Second build should hit cache
    buildDependencyGraph(testFiles, { cache });
    const statsAfterSecond = cache.stats();

    assert(statsAfterSecond.hits > statsAfterFirst.hits);
  });

  test('findImpacted works with cache option', async () => {
    const cache = createCache();

    const impacted = await findImpacted({
      changedFiles: [join(fixtures, 'source.cjs')],
      testFiles: [join(fixtures, 'affected.test.cjs')],
      cache,
    });

    assert(impacted.includes(join(fixtures, 'affected.test.cjs')));
    assert(cache.stats().size > 0);
  });

  test('findImpacted works with cacheFile option', async () => {
    const cacheFilePath = join(fixtures, '.test-cache.json');

    // Clean up any existing cache file
    if (existsSync(cacheFilePath)) {
      unlinkSync(cacheFilePath);
    }

    try {
      const impacted = await findImpacted({
        changedFiles: [join(fixtures, 'source.cjs')],
        testFiles: [join(fixtures, 'affected.test.cjs')],
        cwd: fixtures,
        cacheFile: '.test-cache.json',
      });

      assert(impacted.includes(join(fixtures, 'affected.test.cjs')));
      assert(existsSync(cacheFilePath));
    } finally {
      // Clean up
      if (existsSync(cacheFilePath)) {
        unlinkSync(cacheFilePath);
      }
    }
  });

  test('cache invalidates on file modification time change', () => {
    const cache = createCache();
    const filePath = join(fixtures, 'source.cjs');

    // Store with current mtime
    cache.set(filePath, ['./old-dep.js']);

    // Manually corrupt the mtime to simulate file change
    const entry = cache.data.get(filePath);
    entry.mtime = 0;

    // Should return null (cache miss) due to mtime mismatch
    assert.strictEqual(cache.get(filePath), null);
  });
});
