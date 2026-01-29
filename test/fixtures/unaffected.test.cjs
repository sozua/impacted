'use strict';

const { test } = require('node:test');

// Does NOT import source.cjs
test('unaffected test', () => {
  // Should not run when source.cjs changes
});
