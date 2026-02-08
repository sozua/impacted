import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('standalone', () => {
  it('does basic arithmetic without importing project source', () => {
    assert.equal(1 + 1, 2);
  });
});
