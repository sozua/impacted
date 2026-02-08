import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { capitalize, slugify } from '../src/utils.js';

describe('utils', () => {
  it('capitalizes', () => {
    assert.equal(capitalize('hello'), 'Hello');
  });

  it('slugifies', () => {
    assert.equal(slugify('Hello World'), 'hello-world');
  });
});
