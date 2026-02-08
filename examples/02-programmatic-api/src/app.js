import { createLogger } from './logger.js';

const log = createLogger('app');

export function start() {
  return log.info('started');
}
