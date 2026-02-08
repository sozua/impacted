# 04 — Test Runners

`impacted` outputs file paths — any runner accepts them:

```bash
echo 'src/calculator.js' | npx impacted -p 'test/**/*.test.js' | xargs node --test
echo 'src/calculator.js' | npx impacted -p 'test/**/*.test.js' | xargs npx vitest run
echo 'src/calculator.js' | npx impacted -p 'test/**/*.test.js' | xargs npx jest
```

```bash
npm install && npm run demo
```
