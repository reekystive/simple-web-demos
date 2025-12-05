/**
 * Type definitions for sync-ts-project-refs
 */

export interface WorkspaceConfig {
  includePatterns: string[];
  excludePatterns: string[];
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
  useAlterTsconfig?: boolean;
  alterTsconfigPath?: string;
  skipAddAlterTsconfigToMainTsconfig?: boolean;
  includeDepsInMainTsconfigIfAlterTsconfigExists?: boolean;
  excludeThisPackage?: boolean;
  skipDeps?: boolean;
  skipDevDeps?: boolean;
  skipOptionalDeps?: boolean;
  extraRefs?: { path: string }[];
  skipRefs?: { path: string }[];
}

export interface TsconfigConfig {
  excludeThisTsconfig?: boolean;
  extraRefs?: { path: string }[];
  skipRefs?: { path: string }[];
}

export interface PackageInfo {
  name: string;
  packageJsonPath: string;
  tsconfigPath: string; // Standard tsconfig.json path
  tsconfigTsserverPath: string | null; // Main tsconfig path (could be overridden)
  tsconfigPaths: string[]; // Non-standard tsconfig.*.json paths
  workspaceDeps: string[];
  packageConfig: PackageConfig;
  tsconfigConfigs: Map<string, TsconfigConfig>; // tsconfig path -> config
}
