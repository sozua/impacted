import { resolve } from 'node:path';
import fg from 'fast-glob';
import isGlob from 'is-glob';
import { getImpactedTests } from './graph.js';
import { createCache, ImportCache } from './cache.js';

/**
 * Find test files impacted by code changes
 *
 * @param {Object} options
 * @param {string[]} options.changedFiles - Files that changed (relative or absolute)
 * @param {string|string[]} options.testFiles - Test file glob pattern(s) or explicit file list
 * @param {string} [options.cwd=process.cwd()] - Working directory
 * @param {string[]} [options.excludePaths=['node_modules', 'dist']] - Paths to exclude from graph
 * @param {ImportCache} [options.cache] - Cache instance for import extraction
 * @param {string} [options.cacheFile] - Path to persist cache (creates cache automatically)
 * @returns {Promise<string[]>} Impacted test file paths (absolute)
 *
 * @example
 * import { findImpacted } from 'impacted';
 *
 * const tests = await findImpacted({
 *   changedFiles: ['src/utils.js'],
 *   testFiles: 'test/** /*.test.js',
 * });
 *
 * @example
 * // With persistent caching
 * const tests = await findImpacted({
 *   changedFiles: ['src/utils.js'],
 *   testFiles: 'test/** /*.test.js',
 *   cacheFile: '.impacted-cache.json',
 * });
 */
export async function findImpacted(options) {
  const {
    changedFiles,
    testFiles,
    cwd = process.cwd(),
    excludePaths,
    cache: providedCache,
    cacheFile,
  } = options;

  if (!changedFiles || changedFiles.length === 0) {
    return [];
  }

  // Resolve changed files to absolute paths
  const absoluteChangedFiles = changedFiles.map((f) => resolve(cwd, f));

  // Resolve test files - either glob or explicit list
  let absoluteTestFiles;
  if (typeof testFiles === 'string' || (Array.isArray(testFiles) && testFiles.some((t) => isGlob(t)))) {
    // It's a glob pattern
    const patterns = Array.isArray(testFiles) ? testFiles : [testFiles];
    absoluteTestFiles = await fg(patterns, { cwd, absolute: true });
  } else if (Array.isArray(testFiles)) {
    // Explicit file list
    absoluteTestFiles = testFiles.map((f) => resolve(cwd, f));
  } else {
    return [];
  }

  if (absoluteTestFiles.length === 0) {
    return [];
  }

  // Set up cache
  let cache = providedCache;
  if (!cache && cacheFile) {
    cache = createCache({ cacheFile: resolve(cwd, cacheFile) });
  }

  const result = getImpactedTests(absoluteChangedFiles, absoluteTestFiles, {
    excludePaths,
    cache,
  });

  // Persist cache if using cacheFile option
  if (!providedCache && cacheFile && cache) {
    cache.save();
  }

  return result;
}

// Re-export lower-level APIs for advanced usage
export { buildDependencyGraph, findImpactedTests, invertGraph } from './graph.js';
export { parseImports } from './parser.js';
export { resolveSpecifier } from './resolver.js';
export { createCache, ImportCache } from './cache.js';
