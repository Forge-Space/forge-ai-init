import { existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { DetectedStack } from './types.js';
import { scanProject, type ScanReport } from './scanner.js';

export interface ArchPlan {
  stack: DetectedStack;
  scan: ScanReport;
  structure: ProjectStructure;
  risks: ArchRisk[];
  recommendations: ArchRecommendation[];
  adrs: AdrSuggestion[];
  scalingStrategy: string;
  qualityGates: QualityGate[];
}

export interface ProjectStructure {
  totalFiles: number;
  sourceFiles: number;
  testFiles: number;
  configFiles: number;
  topDirs: string[];
  entryPoints: string[];
  testRatio: number;
}

export interface ArchRisk {
  area: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

export interface ArchRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could';
}

export interface AdrSuggestion {
  title: string;
  context: string;
  decision: string;
}

export interface QualityGate {
  phase: string;
  threshold: number;
  checks: string[];
}

const SOURCE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.vue', '.svelte',
]);

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.go$/,
  /_test\.py$/,
  /test_.*\.py$/,
  /Test\.java$/,
  /Test\.kt$/,
];

const CONFIG_EXTS = new Set([
  '.json', '.yml', '.yaml', '.toml', '.ini', '.env',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', '.venv', 'target', 'vendor',
  '.turbo', '.cache', 'coverage',
]);

function walkProjectFiles(
  dir: string,
  maxFiles = 2000,
): { path: string; ext: string }[] {
  const results: { path: string; ext: string }[] = [];

  function walk(current: string) {
    if (results.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(join(current, entry.name));
        }
      } else {
        const ext = extname(entry.name);
        results.push({ path: join(current, entry.name), ext });
      }
    }
  }

  walk(dir);
  return results;
}

function analyzeStructure(dir: string): ProjectStructure {
  const files = walkProjectFiles(dir);
  const sourceFiles = files.filter((f) => SOURCE_EXTS.has(f.ext));
  const testFiles = files.filter((f) =>
    TEST_PATTERNS.some((p) => p.test(f.path)),
  );
  const configFiles = files.filter((f) => CONFIG_EXTS.has(f.ext));

  let topDirs: string[] = [];
  try {
    topDirs = readdirSync(dir, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          !IGNORE_DIRS.has(e.name) &&
          !e.name.startsWith('.'),
      )
      .map((e) => e.name);
  } catch { /* empty */ }

  const entryPoints = files
    .filter((f) =>
      /index\.[jt]sx?$|main\.[jt]sx?$|app\.[jt]sx?$|__main__\.py$|main\.go$|main\.rs$/
        .test(f.path),
    )
    .map((f) => f.path.replace(dir + '/', ''));

  const testRatio =
    sourceFiles.length > 0
      ? Math.round((testFiles.length / sourceFiles.length) * 100)
      : 0;

  return {
    totalFiles: files.length,
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    configFiles: configFiles.length,
    topDirs,
    entryPoints: entryPoints.slice(0, 10),
    testRatio,
  };
}

function detectRisks(
  stack: DetectedStack,
  scan: ScanReport,
  structure: ProjectStructure,
): ArchRisk[] {
  const risks: ArchRisk[] = [];

  if (structure.testRatio < 20) {
    risks.push({
      area: 'testing',
      severity: 'critical',
      description: `Test ratio is ${structure.testRatio}% — insufficient safety net for changes`,
      mitigation: 'Add characterization tests before any refactoring',
    });
  }

  if (!stack.hasTypeChecking) {
    risks.push({
      area: 'type-safety',
      severity: 'high',
      description: 'No type checking — runtime errors likely in production',
      mitigation: 'Adopt TypeScript incrementally or add mypy/pyright',
    });
  }

  if (!stack.hasLinting) {
    risks.push({
      area: 'code-quality',
      severity: 'medium',
      description: 'No linter configured — inconsistent code patterns',
      mitigation: 'Add ESLint/Ruff/golangci-lint with strict rules',
    });
  }

  if (!stack.hasCi) {
    risks.push({
      area: 'ci-cd',
      severity: 'high',
      description: 'No CI/CD — bugs ship without automated validation',
      mitigation: 'Add GitHub Actions or GitLab CI with lint + test + build',
    });
  }

  const securityFindings = scan.findings.filter(
    (f) => f.category === 'security',
  );
  if (securityFindings.length > 0) {
    risks.push({
      area: 'security',
      severity: 'critical',
      description: `${securityFindings.length} security findings (SQL injection, hardcoded secrets, etc.)`,
      mitigation: 'Fix all critical/high security findings before new features',
    });
  }

  const archFindings = scan.findings.filter(
    (f) => f.category === 'architecture',
  );
  if (archFindings.length > 5) {
    risks.push({
      area: 'architecture',
      severity: 'high',
      description: `${archFindings.length} architecture issues (god files, function sprawl)`,
      mitigation: 'Decompose large modules, extract shared logic',
    });
  }

  if (scan.score < 40) {
    risks.push({
      area: 'overall-quality',
      severity: 'critical',
      description: `Quality score ${scan.score}/100 (grade ${scan.grade}) — high technical debt`,
      mitigation: 'Stabilize before adding features: fix critical findings first',
    });
  }

  return risks;
}

function generateRecommendations(
  stack: DetectedStack,
  scan: ScanReport,
  structure: ProjectStructure,
): ArchRecommendation[] {
  const recs: ArchRecommendation[] = [];

  if (structure.testRatio < 50) {
    recs.push({
      category: 'testing',
      title: 'Increase test coverage',
      description: `${structure.testRatio}% test ratio — target 80%+ for safe refactoring`,
      priority: 'must',
    });
  }

  if (!stack.hasFormatting) {
    recs.push({
      category: 'consistency',
      title: 'Add code formatter',
      description: 'Prettier/Black/gofmt eliminates style debates',
      priority: 'should',
    });
  }

  if (stack.monorepo && !existsSync(join('turbo.json'))) {
    recs.push({
      category: 'build',
      title: 'Add build orchestration',
      description: 'Turborepo or Nx for monorepo build caching and task ordering',
      priority: 'should',
    });
  }

  if (scan.findings.filter((f) => f.severity === 'critical').length > 0) {
    recs.push({
      category: 'security',
      title: 'Fix critical security findings immediately',
      description: 'Hardcoded secrets, SQL injection, and other critical issues',
      priority: 'must',
    });
  }

  recs.push({
    category: 'documentation',
    title: 'Create ARCHITECTURE.md',
    description: 'Document layers, data flow, key decisions — prevents knowledge silos',
    priority: 'should',
  });

  recs.push({
    category: 'governance',
    title: 'Define quality gates per phase',
    description: 'Phase 1: 40% (critical only), Phase 2: 60% (+ lint), Phase 3: 80% (full)',
    priority: 'must',
  });

  return recs;
}

function suggestAdrs(
  stack: DetectedStack,
  _structure: ProjectStructure,
): AdrSuggestion[] {
  const adrs: AdrSuggestion[] = [];

  adrs.push({
    title: 'ADR-001: Architecture Style',
    context: `${stack.language} project${stack.framework ? ` using ${stack.framework}` : ''}`,
    decision: stack.framework
      ? `Use ${stack.framework} conventions with layered architecture`
      : 'Use modular architecture with clear dependency boundaries',
  });

  if (stack.monorepo) {
    adrs.push({
      title: 'ADR-002: Monorepo Strategy',
      context: 'Multiple packages need coordinated builds and releases',
      decision: 'Turborepo for build orchestration with workspace dependencies',
    });
  }

  adrs.push({
    title: `ADR-00${stack.monorepo ? 3 : 2}: Testing Strategy`,
    context: 'Need reliable test coverage for safe iteration',
    decision: `${stack.testFramework ?? 'Jest'} for unit tests, Playwright for E2E, >80% coverage target`,
  });

  return adrs;
}

function determineScalingStrategy(stack: DetectedStack): string {
  if (stack.framework === 'nextjs') {
    return 'Edge-first: Vercel/Cloudflare Workers for SSR, CDN for static, Supabase/Planetscale for data';
  }
  if (stack.framework === 'express' || stack.framework === 'nestjs') {
    return 'Horizontal: Container-based (Docker/K8s), load balancer, connection pooling, Redis cache';
  }
  if (stack.framework === 'fastapi' || stack.framework === 'django') {
    return 'ASGI workers (uvicorn/gunicorn), Redis queue for background tasks, read replicas for DB';
  }
  if (stack.framework === 'spring') {
    return 'JVM tuning, horizontal pod autoscaling, connection pooling, distributed cache';
  }
  if (stack.language === 'go') {
    return 'Goroutine-native concurrency, single binary deploy, horizontal scaling with load balancer';
  }
  if (stack.language === 'rust') {
    return 'Zero-cost abstractions, single binary deploy, tokio async runtime for IO-bound work';
  }
  return 'Start vertical (bigger instance), then horizontal (load balancer + stateless services)';
}

function defineQualityGates(): QualityGate[] {
  return [
    {
      phase: 'Phase 1 — Foundation (40%)',
      threshold: 40,
      checks: ['no critical security findings', 'basic tests exist', 'CI pipeline runs'],
    },
    {
      phase: 'Phase 2 — Stabilization (60%)',
      threshold: 60,
      checks: ['linting enabled', 'type checking passes', '>50% test coverage', 'no high-severity findings'],
    },
    {
      phase: 'Phase 3 — Production (80%)',
      threshold: 80,
      checks: ['full governance enforcement', '>80% test coverage', 'all findings addressed', 'ARCHITECTURE.md current'],
    },
  ];
}

export function generatePlan(
  dir: string,
  stack: DetectedStack,
): ArchPlan {
  const scan = scanProject(dir);
  const structure = analyzeStructure(dir);
  const risks = detectRisks(stack, scan, structure);
  const recommendations = generateRecommendations(stack, scan, structure);
  const adrs = suggestAdrs(stack, structure);
  const scalingStrategy = determineScalingStrategy(stack);
  const qualityGates = defineQualityGates();

  return {
    stack,
    scan,
    structure,
    risks,
    recommendations,
    adrs,
    scalingStrategy,
    qualityGates,
  };
}
