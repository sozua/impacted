import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, capitalize } from '#utils';

describe('utils', () => {
  it('formats a date', () => {
    assert.equal(formatDate(new Date('2025-06-15')), '2025-06-15');
  });

  it('capitalizes a string', () => {
    assert.equal(capitalize('hello'), 'Hello');
  });
});
