# Examples

| Example | What it shows |
| --- | --- |
| [01-basic-cli](./01-basic-cli) | CLI stdin, `-p` flag, direct & transitive deps, ESM + CJS |
| [02-programmatic-api](./02-programmatic-api) | `findImpacted()`, graph building, caching |
| [03-subpath-imports](./03-subpath-imports) | `#imports` field resolution |
| [04-test-runners](./04-test-runners) | Piping output to node --test, vitest, jest |

Each example is self-contained. To run one:

```bash
cd examples/01-basic-cli
npm install && npm run demo
```
