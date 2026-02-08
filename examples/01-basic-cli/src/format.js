import { add } from './math.js';

export function formatSum(a, b) {
  return `${a} + ${b} = ${add(a, b)}`;
}
