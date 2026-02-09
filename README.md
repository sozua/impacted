# impacted

It takes a list of changed files, builds a dependency graph from your test files by statically analyzing their imports, and returns only the test files that depend on the changed files.

A userland implementation of [predictive test selection for Node.js test runner](https://github.com/nodejs/node/issues/54173).

[![npm version](https://img.shields.io/npm/v/impacted)](https://www.npmjs.com/package/impacted)

## Usage

```bash
# Run only impacted tests (--since gets changed files from git diff)
node --test $(npx impacted --since main)

# Pipe changed files from stdin
node --test $(git diff --name-only main | npx impacted)

# Works with any test runner
vitest $(npx impacted --since main)
jest $(npx impacted --since main)

# Custom test pattern
npx impacted --since main -p "src/**/*.spec.js"

# Multiple patterns
npx impacted --since main -p "test/**/*.test.js" -p "test/**/*.spec.js"
```

## GitHub Action

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: sozua/impacted@v1
  id: impacted
  with:
    pattern: '**/*.{test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'  # default

- name: Run impacted tests
  if: steps.impacted.outputs.has-impacted == 'true'
  run: node --test ${{ steps.impacted.outputs.files }}
```

See [action.yml](https://github.com/sozua/impacted/blob/main/action.yml) for all inputs and outputs.

## Programmatic API

```javascript
import { findImpacted } from 'impacted';

const tests = await findImpacted({
  changedFiles: ['src/utils.js'],
  testFiles: 'test/**/*.test.js',
  cacheFile: '.impacted-cache.json', // optional
});
```

### `node:test` `run()` integration

```javascript
import { run } from 'node:test';
import { findImpacted } from 'impacted';

const files = await findImpacted({
  changedFiles: ['src/utils.js'],
  testFiles: 'test/**/*.test.js',
});

run({ files });
```

See [examples/05-node-test-run](./examples/05-node-test-run) for a full working example.

## TypeScript

TypeScript files (`.ts`, `.mts`, `.cts`, `.tsx`) are supported out of the box on Node.js >= 22.7. Type stripping is handled via `node:module.stripTypeScriptTypes()` — no additional dependencies required.

Follows Node.js core's TypeScript philosophy: explicit extensions, no `tsconfig.json`, no path aliases.

## Limitations

- Static analysis only — dynamic `require(variable)` not supported
- Local files only — `node_modules` changes won't trigger tests
- TypeScript support requires Node.js >= 22.7 (JS analysis works on Node.js >= 18)

## Requirements

- Node.js >= 18 (TypeScript support requires >= 22.7)

## License

MIT
