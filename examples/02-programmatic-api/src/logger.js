export function createLogger(prefix) {
  return {
    info: (msg) => `[${prefix}] INFO: ${msg}`,
    error: (msg) => `[${prefix}] ERROR: ${msg}`,
  };
}
