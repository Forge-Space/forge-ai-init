export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java';

export type Framework =
  | 'nextjs'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'express'
  | 'fastapi'
  | 'django'
  | 'spring'
  | 'flask'
  | 'nestjs'
  | 'nuxt'
  | 'sveltekit'
  | 'remix'
  | 'astro';

export type BuildTool =
  | 'vite'
  | 'webpack'
  | 'turbopack'
  | 'esbuild'
  | 'tsup'
  | 'rollup'
  | 'parcel';

export type PackageManager =
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'bun'
  | 'pip'
  | 'poetry'
  | 'cargo'
  | 'go';

export type TestFramework =
  | 'jest'
  | 'vitest'
  | 'pytest'
  | 'mocha'
  | 'playwright'
  | 'cypress';

export type CIProvider =
  | 'github-actions'
  | 'gitlab-ci'
  | 'circleci'
  | 'jenkins';

export type AITool =
  | 'claude'
  | 'cursor'
  | 'windsurf'
  | 'copilot';

export type Tier = 'lite' | 'standard' | 'enterprise';

export interface TenantQualityPolicy {
  min_quality_score: number;
  block_on_critical: boolean;
  block_on_high: boolean;
}

export interface TenantCiPolicy {
  require_sonar: boolean;
  require_security_scan: boolean;
  enforce_pr_checks: boolean;
}

export interface TenantProfile {
  tenant_id: string;
  github_owner: string;
  sonar_org: string;
  npm_scope: string;
  quality_policy: TenantQualityPolicy;
  ci_policy: TenantCiPolicy;
}

export interface TenantContext {
  tenantId: string;
  profileRef: string;
  profilePath: string;
  profile: TenantProfile;
}

export interface DetectedStack {
  language: Language;
  framework?: Framework;
  buildTool?: BuildTool;
  packageManager: PackageManager;
  monorepo: boolean;
  testFramework?: TestFramework;
  hasLinting: boolean;
  hasTypeChecking: boolean;
  hasFormatting: boolean;
  hasCi: boolean;
  ciProvider?: CIProvider;
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
  devCommand?: string;
}

export interface GenerateOptions {
  projectDir: string;
  tier: Tier;
  tools: AITool[];
  force: boolean;
  dryRun: boolean;
  migrate?: boolean;
}

export interface GenerateResult {
  created: string[];
  skipped: string[];
}
