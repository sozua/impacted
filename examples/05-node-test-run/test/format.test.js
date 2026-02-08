import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatTitle } from '../src/format.js';

describe('format', () => {
  it('formats title', () => {
    assert.equal(formatTitle('hello world'), 'Hello World');
  });
});
