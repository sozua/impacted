# impacted

It takes a list of changed files, builds a dependency graph from your test files by statically analyzing their imports, and returns only the test files that depend on the changed files.

A userland implementation of [predictive test selection for Node.js test runner](https://github.com/nodejs/node/issues/54173).

[![npm version](https://img.shields.io/npm/v/impacted)](https://www.npmjs.com/package/impacted)

## Usage

```bash
# Run only impacted tests
node --test $(git diff --name-only main | npx impacted)

# Works with any test runner
vitest $(git diff --name-only main | npx impacted)
jest $(git diff --name-only main | npx impacted)

# Custom test pattern
git diff --name-only main | npx impacted -p "src/**/*.spec.js"

# Multiple patterns
git diff --name-only main | npx impacted -p "test/**/*.test.js" -p "test/**/*.spec.js"
```

## GitHub Action

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: sozua/impacted@v1
  id: impacted
  with:
    pattern: '**/*.{test,spec}.{js,mjs,cjs,jsx}'  # default

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

## Limitations

- JavaScript only (`.js`, `.mjs`, `.cjs`, `.jsx`) — no TypeScript yet
- Static analysis only — dynamic `require(variable)` not supported
- Local files only — `node_modules` changes won't trigger tests

## Requirements

- Node.js >= 18

## License

MIT
