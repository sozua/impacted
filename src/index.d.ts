export interface FindImpactedOptions {
  /** Files that changed (relative or absolute) */
  changedFiles: string[];
  /** Test file glob pattern(s) or explicit file list */
  testFiles: string | string[];
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  /** Paths to exclude from graph (default: ['node_modules', 'dist']) */
  excludePaths?: string[];
  /** Cache instance for import extraction */
  cache?: ImportCache;
  /** Path to persist cache (creates cache automatically) */
  cacheFile?: string;
}

export interface GraphOptions {
  /** Paths to exclude from graph (default: ['node_modules', 'dist']) */
  excludePaths?: string[];
  /** Cache instance for import extraction */
  cache?: ImportCache;
}

export interface CacheOptions {
  /** Path to persist cache */
  cacheFile?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/** Find test files impacted by code changes */
export function findImpacted(options: FindImpactedOptions): Promise<string[]>;

/** Build a dependency graph starting from entry files */
export function buildDependencyGraph(
  entryFiles: string[],
  options?: GraphOptions,
): Map<string, Set<string>>;

/** Find test files impacted by changed files given a dependency graph */
export function findImpactedTests(
  changedFiles: string[],
  testFiles: string[],
  graph: Map<string, Set<string>>,
): string[];

/** Invert a dependency graph (file → deps becomes dep → dependents) */
export function invertGraph(
  graph: Map<string, Set<string>>,
): Map<string, Set<string>>;

/** Extract import/require specifiers from source code */
export function parseImports(source: string): string[];

/** Resolve an import specifier to an absolute file path */
export function resolveSpecifier(
  specifier: string,
  parentPath: string,
): string | null;

/** Create a cache instance */
export function createCache(options?: CacheOptions): ImportCache;

/** Cache for import extraction results with mtime-based invalidation */
export class ImportCache {
  constructor(options?: CacheOptions);
  /** Get cached imports for a file, or null if not cached/stale */
  get(filePath: string): string[] | null;
  /** Store imports for a file */
  set(filePath: string, imports: string[]): void;
  /** Get cache statistics */
  stats(): CacheStats;
  /** Persist cache to disk */
  save(): void;
  /** Clear all cached data */
  clear(): void;
}
