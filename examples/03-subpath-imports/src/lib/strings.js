import { capitalize } from '#utils';

export function titleCase(str) {
  return str.split(' ').map(capitalize).join(' ');
}
