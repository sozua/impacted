import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('unrelated', () => {
  it('has no source dependencies', () => {
    assert.equal(typeof Date.now(), 'number');
  });
});
