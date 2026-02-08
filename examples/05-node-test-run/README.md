# 05 — node:test run() integration

Use `findImpacted()` with the `node:test` `run()` API for programmatic predictive test selection:

```js
import { run } from 'node:test';
import { findImpacted } from 'impacted';

const files = await findImpacted({
  changedFiles: ['src/utils.js'],
  testFiles: 'test/**/*.test.js',
});

run({ files });
```

See [nodejs/node#54173](https://github.com/nodejs/node/issues/54173) for the upstream discussion.

```bash
npm install && npm run demo
```
