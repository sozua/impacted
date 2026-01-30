# impacted

Find test files impacted by code changes using static dependency analysis.

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
```

## GitHub Action

```yaml
- uses: sozua/impacted@v1
  id: impacted
  with:
    pattern: '**/*.test.js'

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

## How it works

Builds a dependency graph from your test files, inverts it, and walks from changed files to find impacted tests.

```
src/utils.js (changed)
    ↓ imported by
src/parser.js
    ↓ imported by
test/parser.test.js (impacted)
```

## Limitations

- JavaScript only (`.js`, `.mjs`, `.cjs`, `.jsx`) — no TypeScript yet
- Static analysis only — dynamic `require(variable)` not supported
- Local files only — `node_modules` changes won't trigger tests

## Requirements

- Node.js >= 18

## License

MIT
