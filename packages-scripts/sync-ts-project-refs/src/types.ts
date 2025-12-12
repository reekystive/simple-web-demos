/**
 * Type definitions for sync-ts-project-refs
 */

export interface Ref {
  path: string;
}

export interface RootConfig {
  graph: {
    includeIndirectDeps: boolean;
  };
  filters: {
    /**
     * Glob patterns (pnpm-workspace style, supports "!glob") for packages to hard-exclude from processing.
     * If a package matches, it is ignored regardless of any per-package config.
     */
    excludePackages: string[];
    /**
     * Glob patterns (pnpm-workspace style, supports "!glob") for tsconfig files to hard-exclude from processing.
     * If a tsconfig matches, it is ignored regardless of any per-tsconfig config.
     */
    excludeTsconfigs: string[];
  };
  rootSolution: {
    /**
     * Path to the root solution tsconfig that should aggregate workspace package references.
     * Relative paths are resolved from the workspace root.
     */
    tsconfigPath: string;
    /**
     * Whether to include sibling root tsconfig.*.json files (e.g. tsconfig.node.json) as references.
     */
    includeSiblings: boolean;
    /**
     * References that apply ONLY to the root solution tsconfig file.
     */
    references: {
      add: Ref[];
      skip: Ref[];
    };
  };
}

export interface WorkspaceConfig {
  includePatterns: string[];
  excludePatterns: string[];
  rootConfig: RootConfig;
}

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface TsConfig {
  references?: { path: string }[];
  [key: string]: unknown;
}

export interface PackageConfig {
  /**
   * Whether to exclude this package from processing.
   */
  exclude: boolean;
  canonicalTsconfig: {
    /**
     * Canonical tsconfig path for this package (the file other packages should reference).
     * Relative to the package root.
     *
     * Defaults to "./tsconfig.json".
     */
    path: string;
    /**
     * Whether the canonical tsconfig should reference sibling tsconfig.*.json files (discovery).
     */
    includeSiblings: boolean;
    /**
     * Whether the standard tsconfig.json should reference the canonical tsconfig (discovery).
     * If canonical path is "./tsconfig.json", this is effectively always false.
     */
    standardReferencesCanonical: boolean;
    /**
     * Whether the canonical tsconfig should include workspace dependency references.
     */
    includeWorkspaceDeps: boolean;
  };
  dependencies: {
    include: {
      dependencies: boolean;
      devDependencies: boolean;
      optionalDependencies: boolean;
    };
  };
  /**
   * References that apply ONLY to the canonical tsconfig file.
   */
  references: {
    add: Ref[];
    skip: Ref[];
  };
}

export interface TsconfigConfig {
  /**
   * Whether to exclude this specific tsconfig from processing.
   */
  exclude: boolean;
  /**
   * Whether this specific tsconfig should include workspace dependency references.
   * If not set, behavior is derived by the updater (depends on whether this is the canonical tsconfig).
   */
  includeWorkspaceDeps?: boolean;
  references: {
    add: Ref[];
    skip: Ref[];
  };
}

export interface PackageInfo {
  name: string;
  packageJsonPath: string;
  packageDir: string;
  standardTsconfigPath: string; // ./tsconfig.json
  canonicalTsconfigPath: string; // resolved from PackageConfig.canonicalTsconfig.path
  tsconfigPaths: string[]; // All other tsconfig.*.json paths in this package (absolute)
  workspaceDeps: string[];
  packageConfig: PackageConfig;
  tsconfigConfigs: Map<string, TsconfigConfig>; // tsconfig path -> config
}
