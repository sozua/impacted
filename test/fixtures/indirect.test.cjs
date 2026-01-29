'use strict';

const { test } = require('node:test');
const { helper } = require('./helper.cjs');

// Imports helper.cjs which imports source.cjs (indirect dependency)
test('indirect test - uses helper which uses source', () => {
  if (helper() !== 3) {
    throw new Error('helper failed');
  }
});
