'use strict';

const { test } = require('node:test');
const { add } = require('./source.cjs');

test('affected test - uses source', () => {
  if (add(1, 2) !== 3) {
    throw new Error('add failed');
  }
});
