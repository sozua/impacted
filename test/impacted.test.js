import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlinkSync, existsSync } from 'node:fs';
import { findImpacted, buildDependencyGraph, parseImports, resolveSpecifier, createCache } from '../src/index.js';

import * as nodeModule from 'node:module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixtures = join(__dirname, 'fixtures');
const subpathFixtures = join(fixtures, 'subpath');
const tsFixtures = join(fixtures, 'typescript');
const hasTypeScriptStripping = typeof nodeModule.stripTypeScriptTypes === 'function';

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

describe('TypeScript parseImports', { skip: !hasTypeScriptStripping && 'requires Node.js >= 22.7' }, () => {
  test('parses TS imports with type annotations', () => {
    const source = `import { add } from './source.ts';\nconst x: number = add(1, 2);`;
    const imports = parseImports(source, { typescript: true });
    assert.deepStrictEqual(imports, ['./source.ts']);
  });

  test('import type is stripped (no runtime effect)', () => {
    const source = `import type { Result } from './types.ts';`;
    const imports = parseImports(source, { typescript: true });
    assert.deepStrictEqual(imports, []);
  });

  test('parses generics and interfaces', () => {
    const source = `
import { add } from './source.ts';

interface Result<T> {
  value: T;
  error?: string;
}

type Mapper<T, U> = (input: T) => U;

export type { Result, Mapper };
`;
    const imports = parseImports(source, { typescript: true });
    assert.deepStrictEqual(imports, ['./source.ts']);
  });

  test('parses CJS require in TS', () => {
    const source = `const { helper } = require('./helper.ts');\nconst x: string = helper();`;
    const imports = parseImports(source, { typescript: true });
    assert.deepStrictEqual(imports, ['./helper.ts']);
  });

  test('parses export from in TS (type-only exports stripped)', () => {
    const source = `export { add } from './source.ts';\nexport type { Result } from './types.ts';`;
    const imports = parseImports(source, { typescript: true });
    assert.deepStrictEqual(imports, ['./source.ts']);
  });

  test('parses dynamic import in TS', () => {
    const source = `const mod = await import('./lazy.ts');`;
    const imports = parseImports(source, { typescript: true });
    assert.deepStrictEqual(imports, ['./lazy.ts']);
  });
});

describe('TypeScript resolver', { skip: !hasTypeScriptStripping && 'requires Node.js >= 22.7' }, () => {
  test('resolves .ts relative specifier', () => {
    const parentPath = join(tsFixtures, 'affected.test.ts');
    const resolved = resolveSpecifier('./source.ts', parentPath);
    assert.strictEqual(resolved, join(tsFixtures, 'source.ts'));
  });

  test('resolves .ts from another TS file', () => {
    const parentPath = join(tsFixtures, 'helper.ts');
    const resolved = resolveSpecifier('./source.ts', parentPath);
    assert.strictEqual(resolved, join(tsFixtures, 'source.ts'));
  });

  test('returns null for non-existent .ts file', () => {
    const parentPath = join(tsFixtures, 'helper.ts');
    const resolved = resolveSpecifier('./nonexistent.ts', parentPath);
    assert.strictEqual(resolved, null);
  });
});

describe('TypeScript buildDependencyGraph', { skip: !hasTypeScriptStripping && 'requires Node.js >= 22.7' }, () => {
  test('builds graph from TS files', () => {
    const testFiles = [
      join(tsFixtures, 'affected.test.ts'),
      join(tsFixtures, 'unaffected.test.ts'),
    ];
    const graph = buildDependencyGraph(testFiles);

    assert(graph.has(join(tsFixtures, 'affected.test.ts')));
    assert(graph.has(join(tsFixtures, 'unaffected.test.ts')));

    const affectedDeps = graph.get(join(tsFixtures, 'affected.test.ts'));
    assert(affectedDeps.has(join(tsFixtures, 'source.ts')));
  });

  test('follows transitive TS dependencies', () => {
    const testFiles = [join(tsFixtures, 'indirect.test.ts')];
    const graph = buildDependencyGraph(testFiles);

    // indirect.test.ts -> helper.ts -> source.ts
    assert(graph.has(join(tsFixtures, 'indirect.test.ts')));
    assert(graph.has(join(tsFixtures, 'helper.ts')));
    assert(graph.has(join(tsFixtures, 'source.ts')));
  });
});

describe('TypeScript findImpacted', { skip: !hasTypeScriptStripping && 'requires Node.js >= 22.7' }, () => {
  test('finds directly impacted TS tests', async () => {
    const impacted = await findImpacted({
      changedFiles: [join(tsFixtures, 'source.ts')],
      testFiles: [
        join(tsFixtures, 'affected.test.ts'),
        join(tsFixtures, 'unaffected.test.ts'),
      ],
      cwd: tsFixtures,
    });

    assert(impacted.includes(join(tsFixtures, 'affected.test.ts')));
    assert(!impacted.includes(join(tsFixtures, 'unaffected.test.ts')));
  });

  test('finds transitively impacted TS tests', async () => {
    const impacted = await findImpacted({
      changedFiles: [join(tsFixtures, 'source.ts')],
      testFiles: [
        join(tsFixtures, 'affected.test.ts'),
        join(tsFixtures, 'indirect.test.ts'),
        join(tsFixtures, 'unaffected.test.ts'),
      ],
      cwd: tsFixtures,
    });

    assert(impacted.includes(join(tsFixtures, 'affected.test.ts')));
    assert(impacted.includes(join(tsFixtures, 'indirect.test.ts')));
    assert(!impacted.includes(join(tsFixtures, 'unaffected.test.ts')));
  });

  test('works with glob patterns for TS', async () => {
    const impacted = await findImpacted({
      changedFiles: ['source.ts'],
      testFiles: '*.test.ts',
      cwd: tsFixtures,
    });

    assert(impacted.some((f) => f.endsWith('affected.test.ts')));
    assert(impacted.some((f) => f.endsWith('indirect.test.ts')));
    assert(!impacted.some((f) => f.endsWith('unaffected.test.ts')));
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
