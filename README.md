# impacted

Find test files impacted by code changes using static dependency analysis.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/impacted)](https://www.npmjs.com/package/impacted)

## About

`impacted` analyzes your codebase's import graph to determine which test files are affected by a set of changed files. Run only the tests that matter instead of your entire test suite.

This project is a userland implementation of [predictive test selection for Node.js test runner](https://github.com/nodejs/node/issues/54173).

## Features

- Static analysis of ESM and CommonJS (import, require, dynamic import, re-exports)
- Supports Node.js subpath imports (`#imports`)
- Transitive dependency tracking
- Optional caching for faster repeated runs
- CLI and programmatic API
- GitHub Action for CI integration

## Installation

```bash
npm install impacted
```

## Usage

### CLI

Pipe changed files to `impacted`:

```bash
git diff --name-only HEAD~1 | npx impacted
```

With a custom test pattern:

```bash
git diff --name-only main | npx impacted -p "src/**/*.spec.js"
```

Use with any test runner:

```bash
# Node.js test runner
node --test $(git diff --name-only main | npx impacted)

# Vitest
vitest $(git diff --name-only main | npx impacted)

# Jest
jest $(git diff --name-only main | npx impacted)
```

### GitHub Action

```yaml
- uses: sozua/impacted@v1
  id: impacted
  with:
    pattern: '**/*.test.js'

- name: Run impacted tests
  if: steps.impacted.outputs.has-impacted == 'true'
  run: node --test ${{ steps.impacted.outputs.files }}
```

#### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `base` | Base ref to compare against | PR base or `HEAD~1` |
| `head` | Head ref | `HEAD` |
| `pattern` | Glob pattern for test files | `**/*.test.js` |
| `working-directory` | Working directory | `.` |

#### Outputs

| Output | Description |
|--------|-------------|
| `files` | Space-separated list of impacted test files |
| `files-json` | JSON array of impacted test files |
| `count` | Number of impacted test files |
| `has-impacted` | Whether any tests are impacted (`true`/`false`) |

### Programmatic API

```javascript
import { findImpacted } from 'impacted';

const tests = await findImpacted({
  changedFiles: ['src/utils.js', 'src/parser.js'],
  testFiles: 'test/**/*.test.js',
});

console.log(tests);
// ['/project/test/utils.test.js', '/project/test/parser.test.js']
```

#### With caching

```javascript
const tests = await findImpacted({
  changedFiles: ['src/utils.js'],
  testFiles: 'test/**/*.test.js',
  cacheFile: '.impacted-cache.json',
});
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `changedFiles` | `string[]` | Files that changed (relative or absolute) |
| `testFiles` | `string \| string[]` | Glob pattern(s) or explicit file list |
| `cwd` | `string` | Working directory (default: `process.cwd()`) |
| `excludePaths` | `string[]` | Paths to exclude (default: `['node_modules', 'dist']`) |
| `cacheFile` | `string` | Path to persist cache between runs |

## How it works

1. Build a dependency graph starting from your test files
2. Invert the graph to map each file to its dependents
3. Walk the inverted graph from changed files to find impacted tests

```
src/utils.js (changed)
    ↓ imported by
src/parser.js
    ↓ imported by
test/parser.test.js (impacted)
```

## Known limitations

- **JavaScript only** - Supports `.js`, `.mjs`, `.cjs`, and `.jsx`. TypeScript files are not yet supported.
- **Static analysis** - Cannot detect dynamic imports with variables (e.g., `require(getModuleName())`). Only string literals are resolved.
- **Local files only** - Dependencies in `node_modules` are excluded from the graph. Changes to dependencies won't trigger impacted tests.
- **No TypeScript path aliases** - Only Node.js subpath imports (`#imports` in package.json) are supported, not `tsconfig.json` paths.

## Requirements

- Node.js >= 18

## License

MIT
