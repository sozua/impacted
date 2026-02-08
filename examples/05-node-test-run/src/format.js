import { capitalize } from './utils.js';

export function formatTitle(str) {
  return str.split(' ').map(capitalize).join(' ');
}
