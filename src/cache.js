import { readFileSync, writeFileSync, statSync } from 'node:fs';

/**
 * Cache for import extraction results with mtime-based invalidation
 */
export class ImportCache {
  /**
   * @param {Object} options
   * @param {string} [options.cacheFile] - Path to persist cache (optional)
   */
  constructor(options = {}) {
    this.cacheFile = options.cacheFile;
    this.data = new Map();
    this.hits = 0;
    this.misses = 0;

    if (this.cacheFile) {
      this._load();
    }
  }

  /**
   * Get cached imports for a file, or null if not cached/stale
   * @param {string} filePath - Absolute file path
   * @returns {string[] | null}
   */
  get(filePath) {
    const entry = this.data.get(filePath);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if file has been modified
    let mtime;
    try {
      mtime = statSync(filePath).mtimeMs;
    } catch {
      // File doesn't exist anymore, invalidate
      this.data.delete(filePath);
      this.misses++;
      return null;
    }

    if (entry.mtime !== mtime) {
      this.data.delete(filePath);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.imports;
  }

  /**
   * Store imports for a file
   * @param {string} filePath - Absolute file path
   * @param {string[]} imports - Extracted import specifiers
   */
  set(filePath, imports) {
    let mtime;
    try {
      mtime = statSync(filePath).mtimeMs;
    } catch {
      // Can't stat file, don't cache
      return;
    }

    this.data.set(filePath, { mtime, imports });
  }

  /**
   * Get cache statistics
   * @returns {{ hits: number, misses: number, size: number }}
   */
  stats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.data.size,
    };
  }

  /**
   * Persist cache to disk
   */
  save() {
    if (!this.cacheFile) return;

    const serialized = {};
    for (const [key, value] of this.data) {
      serialized[key] = value;
    }

    try {
      writeFileSync(this.cacheFile, JSON.stringify(serialized), 'utf8');
    } catch {
      // Ignore write errors (e.g., read-only filesystem)
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.data.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Load cache from disk
   * @private
   */
  _load() {
    try {
      const content = readFileSync(this.cacheFile, 'utf8');
      const parsed = JSON.parse(content);
      for (const [key, value] of Object.entries(parsed)) {
        this.data.set(key, value);
      }
    } catch {
      // No cache file or invalid, start fresh
    }
  }
}

/**
 * Create a cache instance
 * @param {Object} [options]
 * @param {string} [options.cacheFile] - Path to persist cache
 * @returns {ImportCache}
 */
export function createCache(options) {
  return new ImportCache(options);
}
