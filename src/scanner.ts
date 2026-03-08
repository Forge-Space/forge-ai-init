import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import {
  loadConfig,
  isRuleDisabled,
  getRuleSeverity,
  isCategoryEnabled,
  isFileIgnored,
  type ForgeConfig,
} from './config.js';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FindingCategory =
  | 'architecture'
  | 'error-handling'
  | 'scalability'
  | 'hardcoded-values'
  | 'engineering'
  | 'security'
  | 'async'
  | 'react'
  | 'accessibility'
  | 'type-safety';

export interface Finding {
  file: string;
  line: number;
  category: FindingCategory;
  severity: Severity;
  rule: string;
  message: string;
}

export interface ScanReport {
  findings: Finding[];
  filesScanned: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: CategoryScore[];
  topFiles: FileScore[];
}

export interface CategoryScore {
  category: FindingCategory;
  count: number;
  critical: number;
  high: number;
}

export interface FileScore {
  file: string;
  count: number;
  worst: Severity;
}

interface Rule {
  pattern: RegExp;
  category: FindingCategory;
  severity: Severity;
  rule: string;
  message: string;
}

const RULES: Rule[] = [
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'empty-catch',
    message: 'Empty catch block swallows errors silently',
  },
  {
    pattern:
      /catch\s*\([^)]*\)\s*\{\s*console\.(log|error|warn)\([^)]*\);\s*\}/g,
    category: 'error-handling',
    severity: 'medium',
    rule: 'console-only-catch',
    message: 'Catch block only logs — errors are lost',
  },
  {
    pattern:
      /(?:password|secret|api_key|apiKey|token)\s*[:=]\s*["'`][^"'`]{4,}["'`]/gi,
    category: 'security',
    severity: 'critical',
    rule: 'hardcoded-secret',
    message: 'Possible hardcoded secret — use environment variables',
  },
  {
    pattern:
      /["'`]https?:\/\/(?!localhost|127\.0\.0\.1|example\.com)[a-z0-9.-]+\.[a-z]{2,}[^"'`]*["'`]/gi,
    category: 'hardcoded-values',
    severity: 'medium',
    rule: 'hardcoded-url',
    message: 'Hardcoded URL — use environment variables or config',
  },
  {
    pattern: /@ts-ignore|@ts-nocheck/g,
    category: 'engineering',
    severity: 'high',
    rule: 'ts-suppress',
    message: '@ts-ignore/@ts-nocheck suppresses type safety',
  },
  {
    pattern: /readFileSync|writeFileSync|appendFileSync|mkdirSync/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'sync-io',
    message: 'Synchronous I/O blocks the event loop',
  },
  {
    pattern: /key\s*=\s*\{?\s*(?:index|i|idx)\s*\}?/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'index-as-key',
    message: 'Array index as React key causes rendering bugs',
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    category: 'security',
    severity: 'high',
    rule: 'unsafe-html',
    message: 'dangerouslySetInnerHTML — XSS risk',
  },
  {
    pattern: /eval\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'eval-usage',
    message: 'eval() — code injection risk',
  },
  {
    pattern: /!important/g,
    category: 'engineering',
    severity: 'low',
    rule: 'css-important',
    message: '!important overrides — hard to maintain',
  },
  {
    pattern: /new Promise\s*\(\s*(?:async|(?:\([^)]*\)\s*=>))/g,
    category: 'async',
    severity: 'high',
    rule: 'promise-constructor-async',
    message:
      'Async function inside Promise constructor — use async/await directly',
  },
  {
    pattern: /\.then\s*\([\s\S]*?\)\s*\.then\s*\([\s\S]*?\)\s*\.then/g,
    category: 'async',
    severity: 'medium',
    rule: 'promise-chain',
    message: 'Deep promise chain — refactor to async/await',
  },
  {
    pattern: /(?:setTimeout|setInterval)\s*\([^,]+,\s*0\s*\)/g,
    category: 'async',
    severity: 'medium',
    rule: 'setTimeout-zero',
    message: 'setTimeout(fn, 0) — use queueMicrotask or proper async',
  },
  {
    pattern:
      /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*fetch\s*\(/g,
    category: 'react',
    severity: 'medium',
    rule: 'fetch-in-useEffect',
    message: 'Fetch in useEffect without cleanup — use a data fetching library',
  },
  {
    pattern:
      /useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState/g,
    category: 'react',
    severity: 'medium',
    rule: 'excessive-useState',
    message: '4+ useState calls — consolidate with useReducer or object state',
  },
  {
    pattern: /:\s*any\b/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'any-type',
    message: 'Explicit `any` type — use a specific type or `unknown`',
  },
  {
    pattern: /as\s+(?!const\b)\w+/g,
    category: 'type-safety',
    severity: 'low',
    rule: 'type-assertion',
    message: 'Type assertion — prefer type narrowing with guards',
  },
  {
    pattern: /!\./g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'non-null-assertion',
    message: 'Non-null assertion (!) — handle null case explicitly',
  },
  {
    pattern: /innerHTML\s*=/g,
    category: 'security',
    severity: 'high',
    rule: 'innerHTML-assignment',
    message: 'innerHTML assignment — XSS risk, use textContent or sanitize',
  },
  {
    pattern: /<img\b[^>]*(?!alt\s*=)[^>]*\/?>/g,
    category: 'accessibility',
    severity: 'medium',
    rule: 'img-no-alt',
    message: 'Image without alt attribute — add alt text for accessibility',
  },
  {
    pattern: /console\.(log|debug|info)\s*\(/g,
    category: 'engineering',
    severity: 'low',
    rule: 'console-log',
    message: 'Console statement — use a logger or remove before production',
  },
  {
    pattern: /TODO|FIXME|HACK|XXX/g,
    category: 'engineering',
    severity: 'low',
    rule: 'todo-marker',
    message: 'TODO/FIXME marker — resolve before merging',
  },
  {
    pattern: /import\s+\w+\s+from\s+['"]lodash['"]/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'lodash-full-import',
    message: 'Full lodash import — use lodash/specific or lodash-es for tree-shaking',
  },
  {
    pattern: /\.forEach\s*\([^)]*=>[^)]*\.push\b/g,
    category: 'engineering',
    severity: 'low',
    rule: 'forEach-push',
    message: 'forEach + push pattern — use map/filter/reduce instead',
  },
  {
    pattern:
      /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:\w+|['"`])/gi,
    category: 'security',
    severity: 'critical',
    rule: 'sql-concatenation',
    message:
      'SQL string concatenation — use parameterized queries to prevent injection',
  },
];

const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.vue',
  '.svelte',
]);

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  'target',
  'coverage',
  '.turbo',
  '.cache',
]);

function walkFiles(
  dir: string,
  maxFiles: number,
): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (IGNORE_DIRS.has(entry)) continue;
      if (entry.startsWith('.')) continue;
      const full = join(current, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (
          stat.isFile() &&
          CODE_EXTENSIONS.has(extname(entry))
        ) {
          files.push(full);
        }
      } catch {
        continue;
      }
    }
  }

  walk(dir);
  return files;
}

function checkFileSize(
  relPath: string,
  lines: string[],
): Finding[] {
  const findings: Finding[] = [];
  const content = lines.join('\n');

  if (lines.length > 500) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'high',
      rule: 'god-file',
      message: `${lines.length} lines — split into smaller modules`,
    });
  } else if (lines.length > 300) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'medium',
      rule: 'large-file',
      message: `${lines.length} lines — consider splitting`,
    });
  }

  const fnCount = (
    content.match(
      /(?:function\s+\w+|(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g,
    ) || []
  ).length;
  if (fnCount > 15) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'high',
      rule: 'function-sprawl',
      message: `${fnCount} functions — too many responsibilities`,
    });
  } else if (fnCount > 10) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'medium',
      rule: 'many-functions',
      message: `${fnCount} functions — consider splitting`,
    });
  }

  return findings;
}

function scanFile(
  filePath: string,
  base: string,
  config: ForgeConfig,
): Finding[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const relPath = relative(base, filePath);

  if (isFileIgnored(config, relPath)) return [];

  const lines = content.split('\n');
  const findings: Finding[] = [];

  findings.push(...checkFileSize(relPath, lines));

  for (const rule of RULES) {
    if (isRuleDisabled(config, rule.rule)) continue;
    if (!isCategoryEnabled(config, rule.category)) continue;

    const severity = getRuleSeverity(
      config,
      rule.rule,
      rule.severity,
    );

    const regex = new RegExp(
      rule.pattern.source,
      rule.pattern.flags,
    );
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line =
        content.slice(0, match.index).split('\n').length;
      findings.push({
        file: relPath,
        line,
        category: rule.category,
        severity,
        rule: rule.rule,
        message: rule.message,
      });
    }
  }

  return findings;
}

function scoreFromFindings(findings: Finding[]): number {
  const weights: Record<Severity, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };
  const penalty = findings.reduce(
    (sum, f) => sum + weights[f.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

function gradeFromScore(
  score: number,
): ScanReport['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function scanProject(
  dir: string,
  maxFiles = 500,
): ScanReport {
  const config = loadConfig(dir);
  const limit = config.maxFiles ?? maxFiles;
  const files = walkFiles(dir, limit);
  const allFindings: Finding[] = [];

  for (const file of files) {
    allFindings.push(...scanFile(file, dir, config));
  }

  allFindings.sort((a, b) => {
    const order: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  const categories = [
    ...new Set(allFindings.map((f) => f.category)),
  ] as FindingCategory[];

  const summary: CategoryScore[] = categories.map((cat) => {
    const catFindings = allFindings.filter(
      (f) => f.category === cat,
    );
    return {
      category: cat,
      count: catFindings.length,
      critical: catFindings.filter(
        (f) => f.severity === 'critical',
      ).length,
      high: catFindings.filter((f) => f.severity === 'high')
        .length,
    };
  });

  summary.sort(
    (a, b) =>
      b.critical * 10 +
      b.high * 5 -
      (a.critical * 10 + a.high * 5),
  );

  const fileMap = new Map<string, Finding[]>();
  for (const f of allFindings) {
    const arr = fileMap.get(f.file) ?? [];
    arr.push(f);
    fileMap.set(f.file, arr);
  }

  const topFiles: FileScore[] = [...fileMap.entries()]
    .map(([file, findings]) => ({
      file,
      count: findings.length,
      worst: findings.reduce(
        (w, f) => {
          const order: Record<Severity, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return order[f.severity] < order[w]
            ? f.severity
            : w;
        },
        'low' as Severity,
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const score = scoreFromFindings(allFindings);

  return {
    findings: allFindings,
    filesScanned: files.length,
    score,
    grade: gradeFromScore(score),
    summary,
    topFiles,
  };
}
