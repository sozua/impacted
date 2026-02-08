import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { start } from '../src/app.js';

describe('app', () => {
  it('logs start message', () => {
    assert.equal(start(), '[app] INFO: started');
  });
});
