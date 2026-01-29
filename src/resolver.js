import { createRequire } from 'node:module';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Find the nearest package.json from a given path
 * @param {string} startPath
 * @returns {{ path: string, pkg: object } | null}
 */
function findPackageJson(startPath) {
  let dir = dirname(startPath);
  const root = resolve('/');

  while (dir !== root) {
    const pkgPath = join(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      return { path: pkgPath, pkg, dir };
    } catch {
      dir = dirname(dir);
    }
  }
  return null;
}

/**
 * Resolve subpath imports (#imports) from package.json imports field
 * @param {string} specifier - The import specifier starting with #
 * @param {string} parentPath - Absolute path to the parent file
 * @returns {string|null}
 */
function resolveSubpathImport(specifier, parentPath) {
  const pkgInfo = findPackageJson(parentPath);
  if (!pkgInfo || !pkgInfo.pkg.imports) {
    return null;
  }

  const { imports } = pkgInfo.pkg;

  // Direct match
  if (imports[specifier]) {
    const target = resolveImportTarget(imports[specifier]);
    if (target) {
      return resolve(pkgInfo.dir, target);
    }
  }

  // Pattern match (e.g., "#utils/*" -> "./src/utils/*")
  for (const [pattern, target] of Object.entries(imports)) {
    if (pattern.includes('*')) {
      const prefix = pattern.slice(0, pattern.indexOf('*'));
      const suffix = pattern.slice(pattern.indexOf('*') + 1);

      if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
        const matched = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
        const resolvedTarget = resolveImportTarget(target);
        if (resolvedTarget) {
          const finalPath = resolvedTarget.replace('*', matched);
          return resolve(pkgInfo.dir, finalPath);
        }
      }
    }
  }

  return null;
}

/**
 * Resolve an import target (handles conditional exports)
 * @param {string|object} target
 * @returns {string|null}
 */
function resolveImportTarget(target) {
  if (typeof target === 'string') {
    return target;
  }

  if (typeof target === 'object' && target !== null) {
    // Priority: import > node > default > require
    const conditions = ['import', 'node', 'default', 'require'];
    for (const condition of conditions) {
      if (target[condition]) {
        return resolveImportTarget(target[condition]);
      }
    }
  }

  return null;
}

/**
 * Resolve a specifier to an absolute file path
 * Handles: CJS require, ESM import, subpath imports (#)
 * @param {string} specifier - The import/require specifier
 * @param {string} parentPath - Absolute path to the parent file
 * @returns {string|null} Resolved absolute path or null if resolution fails
 */
export function resolveSpecifier(specifier, parentPath) {
  // Skip built-in modules
  if (specifier.startsWith('node:') || builtinModules.includes(specifier)) {
    return null;
  }

  // Handle subpath imports (#imports)
  if (specifier.startsWith('#')) {
    return resolveSubpathImport(specifier, parentPath);
  }

  try {
    const require = createRequire(parentPath);
    return require.resolve(specifier);
  } catch {
    return null;
  }
}
