import { test } from 'node:test';
import { formatDate } from '#utils';
import { add } from '#lib/math';

test('uses subpath imports', () => {
  formatDate(new Date());
  add(1, 2);
});
