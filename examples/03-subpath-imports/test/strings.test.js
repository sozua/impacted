import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { titleCase } from '#lib/strings';

describe('strings', () => {
  it('converts to title case', () => {
    assert.equal(titleCase('hello world'), 'Hello World');
  });
});
