# 03 — Subpath Imports

Uses `#imports` in `package.json`:

```json
{ "#utils": "./src/utils.js", "#lib/*": "./src/lib/*.js" }
```

```
src/utils.js
├── test/utils.test.js        (via #utils — direct)
└── src/lib/strings.js
    └── test/strings.test.js  (via #lib/strings — transitive)

src/lib/numbers.js
└── test/numbers.test.js      (via #lib/numbers — direct)
```

```bash
npm install && npm run demo
npm run demo:lib
```
