import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parseImports } from './parser.js';
import { resolveSpecifier } from './resolver.js';

const SUPPORTED_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx'];

/** @typedef {import('./cache.js').ImportCache} ImportCache */

/**
 * Check if a file has a supported extension
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupportedFile(filePath) {
  return SUPPORTED_EXTENSIONS.includes(extname(filePath));
}

/**
 * Extract imports from a file
 * @param {string} filePath - Absolute path to the file
 * @returns {string[]} Array of import specifiers
 */
export function extractImports(filePath) {
  let source;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  return parseImports(source);
}

const DEFAULT_EXCLUDE_PATHS = ['node_modules', 'dist'];

/**
 * Check if a file path matches any excluded path pattern
 * @param {string} filePath
 * @param {string[]} excludePaths
 * @returns {boolean}
 */
function isExcluded(filePath, excludePaths) {
  return excludePaths.some((pattern) => filePath.includes(pattern));
}

/**
 * Build a dependency graph starting from entry files
 * @param {string[]} entryFiles - Array of absolute file paths
 * @param {Object} options
 * @param {string[]} [options.excludePaths=['node_modules', 'dist']] - Paths to exclude from graph
 * @param {ImportCache} [options.cache] - Optional cache for import extraction
 * @returns {Map<string, Set<string>>} Map of file -> dependencies
 */
export function buildDependencyGraph(entryFiles, options = {}) {
  const { excludePaths = DEFAULT_EXCLUDE_PATHS, cache } = options;

  const graph = new Map();
  const visited = new Set();
  const pending = [...entryFiles];

  for (let i = 0; i < pending.length; i++) {
    const file = pending[i];

    if (visited.has(file)) continue;
    visited.add(file);

    if (isExcluded(file, excludePaths)) {
      continue;
    }

    if (!isSupportedFile(file)) {
      continue;
    }

    // Try cache first
    let imports = cache?.get(file);
    if (imports === null || imports === undefined) {
      imports = extractImports(file);
      cache?.set(file, imports);
    }

    const dependencies = new Set();

    for (const specifier of imports) {
      const resolved = resolveSpecifier(specifier, file);
      if (!resolved || isExcluded(resolved, excludePaths)) continue;

      dependencies.add(resolved);
      if (!visited.has(resolved)) {
        pending.push(resolved);
      }
    }

    graph.set(file, dependencies);
  }

  return graph;
}

/**
 * Invert the graph: file -> files that depend on it
 * @param {Map<string, Set<string>>} graph
 * @returns {Map<string, Set<string>>}
 */
export function invertGraph(graph) {
  const inverted = new Map();

  for (const [file, deps] of graph) {
    for (const dep of deps) {
      if (!inverted.has(dep)) {
        inverted.set(dep, new Set());
      }
      inverted.get(dep).add(file);
    }
  }

  return inverted;
}

/**
 * Find all files impacted by changes to the given files
 * @param {string[]} changedFiles - Changed file paths (absolute)
 * @param {string[]} testFiles - Test file paths (absolute)
 * @param {Map<string, Set<string>>} graph - Dependency graph
 * @returns {string[]} Impacted test files
 */
export function findImpactedTests(changedFiles, testFiles, graph) {
  const inverted = invertGraph(graph);
  const impacted = new Set();
  const visited = new Set();
  const pending = [...changedFiles];
  const testSet = new Set(testFiles);

  for (let i = 0; i < pending.length; i++) {
    const file = pending[i];

    if (visited.has(file)) continue;
    visited.add(file);

    // If this file is a test file, it's impacted
    if (testSet.has(file)) {
      impacted.add(file);
    }

    // Add all files that depend on this file
    const dependents = inverted.get(file);
    if (dependents) {
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          pending.push(dependent);
        }
      }
    }
  }

  return [...impacted];
}

/**
 * Main entry: find test files impacted by changed files
 * @param {string[]} changedFiles - Changed files (absolute paths)
 * @param {string[]} testFiles - All test files (absolute paths)
 * @param {Object} options
 * @param {string[]} [options.excludePaths=['node_modules', 'dist']] - Paths to exclude from graph
 * @param {ImportCache} [options.cache] - Optional cache for import extraction
 * @returns {string[]} Impacted test files
 */
export function getImpactedTests(changedFiles, testFiles, options = {}) {
  const graph = buildDependencyGraph(testFiles, options);
  return findImpactedTests(changedFiles, testFiles, graph);
}
