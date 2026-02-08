import { run } from 'node:test';
import { findImpacted } from 'impacted';

const files = await findImpacted({
  changedFiles: ['src/utils.js'],
  testFiles: 'test/**/*.test.js',
});

console.log('Impacted test files:', files);

// Run only the impacted tests
run({ files }).on('test:fail', () => {
  process.exitCode = 1;
});
