import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../src/logger.js';

describe('logger', () => {
  it('creates info messages with prefix', () => {
    const log = createLogger('test');
    assert.equal(log.info('hello'), '[test] INFO: hello');
  });
});
