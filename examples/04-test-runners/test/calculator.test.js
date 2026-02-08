import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { add, subtract, divide } from '../src/calculator.js';

describe('calculator', () => {
  it('adds', () => {
    assert.equal(add(1, 2), 3);
  });

  it('subtracts', () => {
    assert.equal(subtract(5, 3), 2);
  });

  it('divides', () => {
    assert.equal(divide(10, 2), 5);
  });

  it('throws on division by zero', () => {
    assert.throws(() => divide(1, 0), { message: 'Division by zero' });
  });
});
