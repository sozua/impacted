const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { greet } = require('../src/legacy.cjs');

describe('legacy', () => {
  it('greets by name', () => {
    assert.equal(greet('World'), 'Hello, World!');
  });
});
