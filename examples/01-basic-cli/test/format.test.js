import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSum } from '../src/format.js';

describe('format', () => {
  it('formats a sum', () => {
    assert.equal(formatSum(2, 3), '2 + 3 = 5');
  });
});
