# 02 — Programmatic API

```
src/logger.js
├── test/logger.test.js  (direct)
└── src/app.js
    └── test/app.test.js (transitive)

test/health.test.js       (no source deps)
```

`run.js` exercises `findImpacted()`, `buildDependencyGraph()`, `invertGraph()`, and `createCache()`.

```bash
npm install && npm run demo
npm run demo:cache
```
