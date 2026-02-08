# 01 — Basic CLI

```
src/math.js
├── test/math.test.js        (direct)
└── src/format.js
    └── test/format.test.js  (transitive)

src/legacy.cjs
└── test/legacy.test.cjs     (direct)

test/standalone.test.js       (no source deps)
```

```bash
npm install && npm run demo

# Try other files
echo 'src/format.js' | npx impacted -p 'test/**/*.test.{js,cjs}'
echo 'src/legacy.cjs' | npx impacted -p 'test/**/*.test.{js,cjs}'
```
