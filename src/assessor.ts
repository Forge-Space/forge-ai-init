import {
  existsSync,
  readFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import type { DetectedStack } from './types.js';
import {
  type Grade,
  walkFiles,
  scoreToGrade,
  readJson,
} from './shared.js';

export type AssessmentCategory =
  | 'dependencies'
  | 'architecture'
  | 'security'
  | 'quality'
  | 'migration-readiness';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface AssessmentFinding {
  category: AssessmentCategory;
  severity: Severity;
  title: string;
  detail: string;
  file?: string;
  line?: number;
}

export interface CategoryScore {
  category: AssessmentCategory;
  score: number;
  grade: Grade;
  findings: number;
  critical: number;
  high: number;
}

export type { Grade };

export interface AssessmentReport {
  findings: AssessmentFinding[];
  categories: CategoryScore[];
  overallScore: number;
  overallGrade: Grade;
  filesScanned: number;
  migrationStrategy: string;
  migrationReadiness: 'ready' | 'needs-work' | 'high-risk';
  summary: string;
}

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

/* walkFiles, scoreToGrade, readJson, CODE_EXTENSIONS, IGNORE_DIRS imported from shared.ts */

function collectDependencyFindings(
  dir: string,
  stack: DetectedStack,
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];
  const pkgPath = join(dir, 'package.json');
  const pkg = readJson(pkgPath);

  if (!pkg) {
    if (
      stack.language === 'javascript' ||
      stack.language === 'typescript'
    ) {
      findings.push({
        category: 'dependencies',
        severity: 'high',
        title: 'Missing package.json',
        detail: 'No package.json found in project root',
      });
    }
    return findings;
  }

  const deps = {
    ...((pkg['dependencies'] ?? {}) as Record<
      string,
      string
    >),
  };
  const devDeps = {
    ...((pkg['devDependencies'] ?? {}) as Record<
      string,
      string
    >),
  };
  const allDeps = { ...deps, ...devDeps };
  const depCount = Object.keys(deps).length;
  const devDepCount = Object.keys(devDeps).length;

  if (depCount > 50) {
    findings.push({
      category: 'dependencies',
      severity: 'high',
      title: 'Excessive dependencies',
      detail: `${depCount} production deps — high attack surface`,
    });
  } else if (depCount > 30) {
    findings.push({
      category: 'dependencies',
      severity: 'medium',
      title: 'Many dependencies',
      detail: `${depCount} production deps — review for unused`,
    });
  }

  const legacyPkgs: Record<string, string> = {
    jquery: 'jQuery — migrate to modern framework',
    backbone: 'Backbone.js — EOL, migrate to React/Vue',
    angular: 'AngularJS 1.x — EOL, migrate to Angular 2+',
    grunt: 'Grunt — migrate to Vite/esbuild',
    gulp: 'Gulp — migrate to npm scripts',
    bower: 'Bower — deprecated, use npm',
    coffeescript: 'CoffeeScript — migrate to TypeScript',
    moment: 'Moment.js — deprecated, use date-fns',
    request: 'Request — deprecated, use fetch/undici',
  };

  for (const [name, msg] of Object.entries(legacyPkgs)) {
    if (allDeps[name]) {
      const severity: Severity = [
        'angular',
        'backbone',
        'coffeescript',
        'bower',
      ].includes(name)
        ? 'high'
        : 'medium';
      findings.push({
        category: 'dependencies',
        severity,
        title: `Legacy dependency: ${name}`,
        detail: msg,
      });
    }
  }

  const hasLockfile =
    existsSync(join(dir, 'package-lock.json')) ||
    existsSync(join(dir, 'yarn.lock')) ||
    existsSync(join(dir, 'pnpm-lock.yaml')) ||
    existsSync(join(dir, 'bun.lockb'));

  if (!hasLockfile) {
    findings.push({
      category: 'dependencies',
      severity: 'high',
      title: 'No lockfile',
      detail: 'No lockfile — builds are not reproducible',
    });
  }

  const engines = pkg['engines'] as
    | Record<string, string>
    | undefined;
  if (!engines?.['node']) {
    findings.push({
      category: 'dependencies',
      severity: 'medium',
      title: 'No Node.js engine constraint',
      detail: 'No engines.node — runtime version not pinned',
    });
  }

  if (devDepCount === 0 && depCount > 0) {
    findings.push({
      category: 'dependencies',
      severity: 'medium',
      title: 'No devDependencies',
      detail: 'All deps are production — likely missing dev tools',
    });
  }

  return findings;
}

interface FileMetrics {
  path: string;
  lines: number;
  functions: number;
  imports: number;
}

function collectArchitectureFindings(
  dir: string,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];
  const metrics: FileMetrics[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const relPath = relative(dir, file);
    const lines = content.split('\n');
    const fnMatch = content.match(
      /(?:function\s+\w+|(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(|def\s+\w+|func\s+\w+|fn\s+\w+)/g,
    );
    const importMatch = content.match(
      /(?:^import\s|^from\s|^require\(|^const\s.*=\s*require\()/gm,
    );

    metrics.push({
      path: relPath,
      lines: lines.length,
      functions: fnMatch?.length ?? 0,
      imports: importMatch?.length ?? 0,
    });
  }

  const godFiles = metrics.filter((m) => m.lines > 500);
  for (const f of godFiles.slice(0, 5)) {
    findings.push({
      category: 'architecture',
      severity: f.lines > 1000 ? 'critical' : 'high',
      title: 'God file',
      detail: `${f.path}: ${f.lines} lines — split into modules`,
      file: f.path,
      line: 1,
    });
  }

  const highCoupling = metrics.filter((m) => m.imports > 15);
  for (const f of highCoupling.slice(0, 5)) {
    findings.push({
      category: 'architecture',
      severity: 'high',
      title: 'High coupling',
      detail: `${f.path}: ${f.imports} imports`,
      file: f.path,
      line: 1,
    });
  }

  const sprawl = metrics.filter((m) => m.functions > 20);
  for (const f of sprawl.slice(0, 5)) {
    findings.push({
      category: 'architecture',
      severity: 'high',
      title: 'Function sprawl',
      detail: `${f.path}: ${f.functions} functions`,
      file: f.path,
      line: 1,
    });
  }

  const totalFiles = metrics.length;
  const avgLines =
    totalFiles > 0
      ? Math.round(
          metrics.reduce((s, m) => s + m.lines, 0) /
            totalFiles,
        )
      : 0;

  if (avgLines > 200) {
    findings.push({
      category: 'architecture',
      severity: 'medium',
      title: 'High average file size',
      detail: `Average ${avgLines} lines — consider decomposition`,
    });
  }

  const dirs = new Set(
    metrics.map((m) =>
      m.path.split('/').slice(0, -1).join('/'),
    ),
  );
  if (dirs.size < 3 && totalFiles > 20) {
    findings.push({
      category: 'architecture',
      severity: 'medium',
      title: 'Flat directory structure',
      detail: `${totalFiles} files in ${dirs.size} dirs — no modular organization`,
    });
  }

  return findings;
}

function collectSecurityFindings(
  dir: string,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];

  const gitignorePath = join(dir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.env')) {
      findings.push({
        category: 'security',
        severity: 'critical',
        title: '.env not gitignored',
        detail: '.env not excluded — secrets may be committed',
      });
    }
  } else {
    findings.push({
      category: 'security',
      severity: 'high',
      title: 'No .gitignore',
      detail: 'No .gitignore — all files may be committed',
    });
  }

  const secretPatterns: Array<{
    re: RegExp;
    title: string;
    sev: Severity;
  }> = [
    {
      re: /(?:password|secret|api_key|apiKey|token)\s*[:=]\s*["'`][^"'`]{4,}["'`]/gi,
      title: 'Hardcoded secret',
      sev: 'critical',
    },
    {
      re: /(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[0-9A-Z]{16}/g,
      title: 'AWS access key',
      sev: 'critical',
    },
    {
      re: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
      title: 'Private key in source',
      sev: 'critical',
    },
  ];

  const dangerousPatterns: Array<{
    re: RegExp;
    title: string;
    detail: string;
    sev: Severity;
  }> = [
    {
      re: /\beval\s*\(/g,
      title: 'eval() usage',
      detail: 'Code injection risk',
      sev: 'critical',
    },
    {
      re: /dangerouslySetInnerHTML/g,
      title: 'Unsafe HTML injection',
      detail: 'XSS risk — sanitize with DOMPurify',
      sev: 'high',
    },
    {
      re: /innerHTML\s*=/g,
      title: 'Direct innerHTML assignment',
      detail: 'XSS risk — use textContent or sanitize',
      sev: 'high',
    },
    {
      re: /\$\{.*\}\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
      title: 'SQL injection risk',
      detail: 'Template literal in SQL — use parameters',
      sev: 'critical',
    },
    {
      re: /cors\(\s*\)/g,
      title: 'Unrestricted CORS',
      detail: 'cors() with no options allows all origins',
      sev: 'high',
    },
  ];

  let secretCount = 0;
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const relPath = relative(dir, file);

    for (const sp of secretPatterns) {
      const regex = new RegExp(sp.re.source, sp.re.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (secretCount >= 10) break;
        const line = content
          .slice(0, match.index)
          .split('\n').length;
        findings.push({
          category: 'security',
          severity: sp.sev,
          title: sp.title,
          detail: `Possible ${sp.title.toLowerCase()}`,
          file: relPath,
          line,
        });
        secretCount++;
      }
    }

    for (const dp of dangerousPatterns) {
      const regex = new RegExp(dp.re.source, dp.re.flags);
      if (regex.test(content)) {
        findings.push({
          category: 'security',
          severity: dp.sev,
          title: dp.title,
          detail: dp.detail,
          file: relPath,
        });
      }
    }
  }

  if (!existsSync(join(dir, 'SECURITY.md'))) {
    findings.push({
      category: 'security',
      severity: 'medium',
      title: 'No security policy',
      detail: 'No SECURITY.md — no disclosure process',
    });
  }

  return findings;
}

function collectQualityFindings(
  dir: string,
  stack: DetectedStack,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];

  if (!stack.testFramework) {
    findings.push({
      category: 'quality',
      severity: 'critical',
      title: 'No test framework',
      detail: 'No testing setup — code ships untested',
    });
  } else {
    let testFileCount = 0;
    for (const file of files) {
      const rel = relative(dir, file);
      if (
        rel.includes('.test.') ||
        rel.includes('.spec.') ||
        rel.includes('__tests__/') ||
        rel.includes('/test/') ||
        rel.includes('/tests/')
      ) {
        testFileCount++;
      }
    }

    const sourceFiles = files.length - testFileCount;
    const testRatio =
      sourceFiles > 0 ? testFileCount / sourceFiles : 0;

    if (testRatio < 0.1) {
      findings.push({
        category: 'quality',
        severity: 'high',
        title: 'Very low test coverage',
        detail: `${testFileCount} test files / ${sourceFiles} source (${Math.round(testRatio * 100)}%)`,
      });
    } else if (testRatio < 0.3) {
      findings.push({
        category: 'quality',
        severity: 'medium',
        title: 'Low test coverage',
        detail: `${testFileCount} test files / ${sourceFiles} source (${Math.round(testRatio * 100)}%)`,
      });
    }
  }

  if (!stack.hasLinting) {
    findings.push({
      category: 'quality',
      severity: 'high',
      title: 'No linter configured',
      detail: 'No linting — style issues go uncaught',
    });
  }

  if (!stack.hasTypeChecking) {
    findings.push({
      category: 'quality',
      severity: 'high',
      title: 'No type checking',
      detail: 'No type checker — type errors reach production',
    });
  }

  if (!stack.hasFormatting) {
    findings.push({
      category: 'quality',
      severity: 'medium',
      title: 'No code formatter',
      detail: 'No Prettier/EditorConfig — inconsistent style',
    });
  }

  if (!stack.hasCi) {
    findings.push({
      category: 'quality',
      severity: 'high',
      title: 'No CI/CD pipeline',
      detail: 'No CI — code ships without checks',
    });
  }

  let emptyCount = 0;
  let todoCount = 0;
  for (const file of files.slice(0, 200)) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const emptyCatches = (
      content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) ?? []
    ).length;
    emptyCount += emptyCatches;

    const todos = (
      content.match(/(?:TODO|FIXME|HACK|XXX)(?:\s*:|\s)/g) ??
      []
    ).length;
    todoCount += todos;
  }

  if (emptyCount > 0) {
    findings.push({
      category: 'quality',
      severity: emptyCount > 5 ? 'high' : 'medium',
      title: 'Empty catch blocks',
      detail: `${emptyCount} empty catches — errors silently swallowed`,
    });
  }

  if (todoCount > 10) {
    findings.push({
      category: 'quality',
      severity: 'medium',
      title: 'High TODO/FIXME count',
      detail: `${todoCount} markers — unfinished work accumulating`,
    });
  }

  return findings;
}

function collectMigrationReadiness(
  dir: string,
  stack: DetectedStack,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];

  const legacyStacks: Record<string, string> = {
    jquery: 'jQuery -> React/Vue/Svelte',
    backbone: 'Backbone -> React/Vue',
    angular: 'AngularJS 1.x -> Angular 17+ or React',
    ember: 'Ember -> Next.js/Nuxt',
    knockout: 'Knockout -> React/Vue',
  };

  const pkgPath = join(dir, 'package.json');
  const pkg = readJson(pkgPath);
  const allDeps = pkg
    ? {
        ...((pkg['dependencies'] ?? {}) as Record<
          string,
          string
        >),
        ...((pkg['devDependencies'] ?? {}) as Record<
          string,
          string
        >),
      }
    : {};

  for (const [dep, migration] of Object.entries(
    legacyStacks,
  )) {
    if (allDeps[dep]) {
      findings.push({
        category: 'migration-readiness',
        severity: 'high',
        title: `Legacy stack: ${dep}`,
        detail: `Migration path: ${migration}`,
      });
    }
  }

  if (
    stack.language === 'javascript' &&
    !stack.hasTypeChecking
  ) {
    findings.push({
      category: 'migration-readiness',
      severity: 'medium',
      title: 'JavaScript without TypeScript',
      detail: 'Adopt TypeScript before migration',
    });
  }

  if (!stack.testFramework) {
    findings.push({
      category: 'migration-readiness',
      severity: 'critical',
      title: 'No tests — migration unsafe',
      detail: 'Characterization tests required first',
    });
  }

  if (!stack.hasCi) {
    findings.push({
      category: 'migration-readiness',
      severity: 'high',
      title: 'No CI — migration unverifiable',
      detail: 'CI pipeline needed to validate migration',
    });
  }

  const hasDoc =
    existsSync(join(dir, 'README.md')) ||
    existsSync(join(dir, 'ARCHITECTURE.md'));
  if (!hasDoc) {
    findings.push({
      category: 'migration-readiness',
      severity: 'medium',
      title: 'No documentation',
      detail: 'No README or arch docs — team lacks context',
    });
  }

  let globalStateCount = 0;
  for (const file of files.slice(0, 200)) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const globals = (
      content.match(
        /(?:window\.\w+\s*=|global\.\w+\s*=|globalThis\.\w+\s*=)/g,
      ) ?? []
    ).length;
    globalStateCount += globals;
  }

  if (globalStateCount > 5) {
    findings.push({
      category: 'migration-readiness',
      severity: 'high',
      title: 'Global state pollution',
      detail: `${globalStateCount} global assignments — refactor first`,
    });
  } else if (globalStateCount > 0) {
    findings.push({
      category: 'migration-readiness',
      severity: 'medium',
      title: 'Global state usage',
      detail: `${globalStateCount} global assignments`,
    });
  }

  return findings;
}

function scoreCategoryFindings(
  findings: AssessmentFinding[],
): number {
  const penalty = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHTS[f.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

function determineMigrationReadiness(
  score: number,
  findings: AssessmentFinding[],
): AssessmentReport['migrationReadiness'] {
  const criticals = findings.filter(
    (f) => f.severity === 'critical',
  ).length;
  if (criticals > 3 || score < 30) return 'high-risk';
  if (score < 60) return 'needs-work';
  return 'ready';
}

function detectMigrationStrategy(
  stack: DetectedStack,
): string {
  if (
    stack.framework === 'express' ||
    stack.framework === 'fastapi' ||
    stack.framework === 'django' ||
    stack.framework === 'flask'
  ) {
    return 'strangler-fig';
  }
  if (
    stack.framework === 'react' ||
    stack.framework === 'vue' ||
    stack.framework === 'nextjs'
  ) {
    return 'branch-by-abstraction';
  }
  if (stack.language === 'java') {
    return 'parallel-run';
  }
  return 'strangler-fig';
}

function generateSummary(
  report: Omit<AssessmentReport, 'summary'>,
): string {
  const lines: string[] = [];
  lines.push(
    `Health Score: ${report.overallScore}/100 (${report.overallGrade})`,
  );
  lines.push(
    `Migration Readiness: ${report.migrationReadiness}`,
  );
  lines.push(
    `Recommended Strategy: ${report.migrationStrategy}`,
  );
  lines.push(`Files Scanned: ${report.filesScanned}`);
  lines.push(`Total Findings: ${report.findings.length}`);

  const criticals = report.findings.filter(
    (f) => f.severity === 'critical',
  ).length;
  if (criticals > 0) {
    lines.push(
      `Critical Issues: ${criticals} — fix before migration`,
    );
  }

  return lines.join('\n');
}

export function assessProject(
  dir: string,
  stack: DetectedStack,
  maxFiles = 500,
): AssessmentReport {
  const files = walkFiles(dir, maxFiles);

  const depFindings = collectDependencyFindings(dir, stack);
  const archFindings = collectArchitectureFindings(dir, files);
  const secFindings = collectSecurityFindings(dir, files);
  const qualFindings = collectQualityFindings(
    dir,
    stack,
    files,
  );
  const migFindings = collectMigrationReadiness(
    dir,
    stack,
    files,
  );

  const allFindings = [
    ...depFindings,
    ...archFindings,
    ...secFindings,
    ...qualFindings,
    ...migFindings,
  ];

  allFindings.sort((a, b) => {
    const order: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  const categoryMap: Record<
    AssessmentCategory,
    AssessmentFinding[]
  > = {
    dependencies: depFindings,
    architecture: archFindings,
    security: secFindings,
    quality: qualFindings,
    'migration-readiness': migFindings,
  };

  const categories: CategoryScore[] = (
    Object.entries(categoryMap) as Array<
      [AssessmentCategory, AssessmentFinding[]]
    >
  ).map(([cat, catFindings]) => {
    const score = scoreCategoryFindings(catFindings);
    return {
      category: cat,
      score,
      grade: scoreToGrade(score),
      findings: catFindings.length,
      critical: catFindings.filter(
        (f) => f.severity === 'critical',
      ).length,
      high: catFindings.filter(
        (f) => f.severity === 'high',
      ).length,
    };
  });

  const overallScore = Math.round(
    categories.reduce((s, c) => s + c.score, 0) /
      categories.length,
  );

  const partial = {
    findings: allFindings,
    categories,
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    filesScanned: files.length,
    migrationStrategy: detectMigrationStrategy(stack),
    migrationReadiness: determineMigrationReadiness(
      overallScore,
      allFindings,
    ),
    summary: '',
  };

  return {
    ...partial,
    summary: generateSummary(partial),
  };
}
