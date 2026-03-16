import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assessProject } from '../src/assessor.js';
import { collectSecurityFindings } from '../src/assessors/security.js';
import type { DetectedStack } from '../src/types.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-assess-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, name: string, content: string): void {
  const path = join(dir, name);
  const parent = path.substring(0, path.lastIndexOf('/'));
  mkdirSync(parent, { recursive: true });
  writeFileSync(path, content);
}

function makeStack(overrides: Partial<DetectedStack> = {}): DetectedStack {
  return {
    language: 'typescript',
    packageManager: 'npm',
    monorepo: false,
    hasLinting: true,
    hasTypeChecking: true,
    hasFormatting: true,
    hasCi: true,
    testFramework: 'jest',
    ...overrides,
  };
}

describe('assessProject', () => {
  let dir: string;

  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  describe('overall report', () => {
    it('returns all 5 categories', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'SECURITY.md', '# Security\n');
      writeFile(dir, 'README.md', '# Project\n');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { express: '^4.0.0' },
        devDependencies: { jest: '^29.0.0' },
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');

      const report = assessProject(dir, makeStack());
      expect(report.categories).toHaveLength(5);
      const names = report.categories.map((c) => c.category);
      expect(names).toContain('dependencies');
      expect(names).toContain('architecture');
      expect(names).toContain('security');
      expect(names).toContain('quality');
      expect(names).toContain('migration-readiness');
    });

    it('includes grade and score', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');

      const report = assessProject(dir, makeStack());
      expect(report.overallGrade).toMatch(/^[A-DF]$/);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });

    it('detects strangler-fig for Express', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack({ framework: 'express' }));
      expect(report.migrationStrategy).toBe('strangler-fig');
    });

    it('detects branch-by-abstraction for React', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/App.tsx', 'export default function App() { return null; }\n');
      const report = assessProject(dir, makeStack({ framework: 'react' }));
      expect(report.migrationStrategy).toBe('branch-by-abstraction');
    });

    it('detects parallel-run for Java', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/Main.java', 'public class Main {}\n');
      const report = assessProject(dir, makeStack({ language: 'java' }));
      expect(report.migrationStrategy).toBe('parallel-run');
    });

    it('sorts findings by severity', () => {
      writeFile(dir, '.gitignore', 'dist\n');
      writeFile(dir, 'src/app.ts', 'const x = "test";\n');
      const report = assessProject(dir, makeStack());
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < report.findings.length; i++) {
        expect(order[report.findings[i].severity])
          .toBeGreaterThanOrEqual(order[report.findings[i - 1].severity]);
      }
    });

    it('generates summary text', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      expect(report.summary).toContain('Health Score:');
      expect(report.summary).toContain('Migration Readiness:');
    });

    it('is JSON-serializable', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const parsed = JSON.parse(JSON.stringify(report));
      expect(parsed.overallScore).toBe(report.overallScore);
    });
  });

  describe('dependency collector', () => {
    it('detects legacy packages', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { jquery: '^3.0.0', moment: '^2.0.0' },
        devDependencies: {},
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const legacy = report.findings.filter(
        (f) => f.category === 'dependencies' && f.title.includes('Legacy'),
      );
      expect(legacy.length).toBeGreaterThanOrEqual(2);
    });

    it('flags excessive dependencies', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      const deps: Record<string, string> = {};
      for (let i = 0; i < 55; i++) deps[`dep-${i}`] = '^1.0.0';
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: deps, devDependencies: { jest: '^29' }, engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const excessive = report.findings.find((f) => f.title === 'Excessive dependencies');
      expect(excessive).toBeDefined();
      expect(excessive!.severity).toBe('high');
    });

    it('flags missing lockfile', () => {
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { express: '^4' }, devDependencies: {}, engines: { node: '>=18' },
      }));
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      expect(report.findings.find((f) => f.title === 'No lockfile')).toBeDefined();
    });

    it('flags missing engine constraint', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { express: '^4' }, devDependencies: { jest: '^29' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      expect(report.findings.find((f) => f.title === 'No Node.js engine constraint')).toBeDefined();
    });
  });

  describe('architecture collector', () => {
    it('detects god files (>500 lines)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/monster.ts', Array(600).fill('const x = 1;').join('\n'));
      const report = assessProject(dir, makeStack());
      const godFile = report.findings.find((f) => f.title === 'God file');
      expect(godFile).toBeDefined();
      expect(godFile!.severity).toBe('high');
    });

    it('detects critical god files (>1000 lines)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/huge.ts', Array(1100).fill('const x = 1;').join('\n'));
      const report = assessProject(dir, makeStack());
      const godFile = report.findings.find((f) => f.title === 'God file');
      expect(godFile).toBeDefined();
      expect(godFile!.severity).toBe('critical');
    });

    it('detects function sprawl', () => {
      writeFile(dir, '.gitignore', '.env\n');
      const fns = Array(25).fill(0)
        .map((_, i) => `export function fn${i}() { return ${i}; }`)
        .join('\n');
      writeFile(dir, 'src/sprawl.ts', fns);
      const report = assessProject(dir, makeStack());
      expect(report.findings.find((f) => f.title === 'Function sprawl')).toBeDefined();
    });
  });

  describe('security collector', () => {
    it('flags missing .env in gitignore', () => {
      writeFile(dir, '.gitignore', 'dist\nnode_modules\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const envFinding = report.findings.find((f) => f.title === '.env not gitignored');
      expect(envFinding).toBeDefined();
      expect(envFinding!.severity).toBe('critical');
    });

    it('flags unrestricted CORS', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/server.ts', 'app.use(cors());\n');
      const report = assessProject(dir, makeStack());
      expect(report.findings.find((f) => f.title === 'Unrestricted CORS')).toBeDefined();
    });

    it('flags no security policy', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      expect(report.findings.find((f) => f.title === 'No security policy')).toBeDefined();
    });
  });

  describe('quality collector', () => {
    it('flags no test framework', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack({ testFramework: undefined }));
      const noTests = report.findings.find((f) => f.title === 'No test framework');
      expect(noTests).toBeDefined();
      expect(noTests!.severity).toBe('critical');
    });

    it('flags no linter', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack({ hasLinting: false }));
      expect(report.findings.find((f) => f.title === 'No linter configured')).toBeDefined();
    });

    it('flags empty catch blocks', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/bad.ts', 'try { x(); } catch (e) {}\ntry { y(); } catch (err) {}\n');
      const report = assessProject(dir, makeStack());
      expect(report.findings.find((f) => f.title === 'Empty catch blocks')).toBeDefined();
    });

    it('detects low test coverage ratio', () => {
      writeFile(dir, '.gitignore', '.env\n');
      for (let i = 0; i < 20; i++) {
        writeFile(dir, `src/module${i}.ts`, `export const m${i} = ${i};\n`);
      }
      writeFile(dir, 'src/__tests__/one.test.ts', 'test("x", () => {});\n');
      const report = assessProject(dir, makeStack());
      const lowCov = report.findings.find(
        (f) => f.title === 'Very low test coverage' || f.title === 'Low test coverage',
      );
      expect(lowCov).toBeDefined();
    });

    it('overall score drops with poor quality stack', () => {
      writeFile(dir, '.gitignore', 'dist\n');
      writeFile(dir, 'src/app.ts', 'const x = "clean";\n');
      const report = assessProject(dir, makeStack({
        testFramework: undefined, hasLinting: false, hasTypeChecking: false, hasCi: false,
      }));
      expect(report.overallScore).toBeLessThan(90);
      const qualCat = report.categories.find((c) => c.category === 'quality');
      expect(qualCat!.score).toBeLessThan(80);
    });
  });

  describe('security collector — targeted branch coverage', () => {
    it('line 23: flags missing .gitignore entirely (high severity)', () => {
      // No .gitignore at all → else branch at line 22-28
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const noGitignore = report.findings.find((f) => f.title === 'No .gitignore');
      expect(noGitignore).toBeDefined();
      expect(noGitignore!.severity).toBe('high');
    });
  });

  describe('dependency collector — medium many-dependencies branch (line 48)', () => {
    it('flags many dependencies when depCount is 31-50 (medium severity)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      const deps: Record<string, string> = {};
      for (let i = 0; i < 35; i++) deps[`dep-${i}`] = '^1.0.0';
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: deps,
        devDependencies: { jest: '^29' },
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const manyDeps = report.findings.find((f) => f.title === 'Many dependencies');
      expect(manyDeps).toBeDefined();
      expect(manyDeps!.severity).toBe('medium');
    });
  });

  describe('quality collector — uncovered branches', () => {
    it('medium test coverage when ratio is 0.1-0.3 (line 46)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      // 5 source files, 1 test file → ratio = 1/4 = 0.25 (between 0.1 and 0.3)
      for (let i = 0; i < 4; i++) {
        writeFile(dir, `src/module${i}.ts`, `export const m${i} = ${i};\n`);
      }
      writeFile(dir, 'src/__tests__/one.test.ts', 'test("x", () => {});\n');
      const report = assessProject(dir, makeStack());
      const lowCov = report.findings.find((f) => f.title === 'Low test coverage');
      expect(lowCov).toBeDefined();
      expect(lowCov!.severity).toBe('medium');
    });

    it('high severity empty catches when emptyCount > 5 (line 98)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      const catches = Array(7).fill(0).map((_, i) =>
        `try { fn${i}(); } catch (e) {}`,
      ).join('\n');
      writeFile(dir, 'src/catches.ts', catches);
      const report = assessProject(dir, makeStack());
      const emptyCatch = report.findings.find((f) => f.title === 'Empty catch blocks');
      expect(emptyCatch).toBeDefined();
      expect(emptyCatch!.severity).toBe('high');
    });

    it('flags high TODO/FIXME count when todoCount > 10 (line 122)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      const todos = Array(12).fill(0).map((_, i) =>
        `// TODO: fix this thing ${i}`,
      ).join('\n');
      writeFile(dir, 'src/todos.ts', todos);
      const report = assessProject(dir, makeStack());
      const todoFinding = report.findings.find((f) => f.title === 'High TODO/FIXME count');
      expect(todoFinding).toBeDefined();
      expect(todoFinding!.severity).toBe('medium');
    });
  });

  describe('migration readiness collector', () => {
    it('flags legacy stacks (jQuery)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { jquery: '^3.0.0' },
        devDependencies: { jest: '^29' },
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/app.js', 'var x = 1;\n');
      const report = assessProject(dir, makeStack());
      expect(report.findings.find(
        (f) => f.category === 'migration-readiness' && f.title.includes('jquery'),
      )).toBeDefined();
    });

    it('flags no tests as migration unsafe', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack({ testFramework: undefined }));
      const unsafe = report.findings.find(
        (f) => f.category === 'migration-readiness' && f.title.includes('migration unsafe'),
      );
      expect(unsafe).toBeDefined();
      expect(unsafe!.severity).toBe('critical');
    });

    it('marks ready for clean project', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'SECURITY.md', '# Security\n');
      writeFile(dir, 'README.md', '# Project\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { express: '^4' },
        devDependencies: { jest: '^29' },
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      writeFile(dir, 'src/__tests__/index.test.ts', 'test("x", () => {});\n');
      const report = assessProject(dir, makeStack());
      expect(report.migrationReadiness).toBe('ready');
    });

    it('flags global state pollution', () => {
      writeFile(dir, '.gitignore', '.env\n');
      const globals = Array(6).fill(0)
        .map((_, i) => `window.globalVar${i} = "value${i}";`)
        .join('\n');
      writeFile(dir, 'src/legacy.js', globals);
      const report = assessProject(dir, makeStack());
      const gs = report.findings.find((f) => f.title === 'Global state pollution');
      expect(gs).toBeDefined();
      expect(gs!.severity).toBe('high');
    });

    it('flags global state usage (medium) when 1-5 globals (lines 87/105)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      // 3 global assignments → medium severity (> 0 and <= 5)
      writeFile(dir, 'src/globals.js', [
        'window.myVar1 = "a";',
        'window.myVar2 = "b";',
        'window.myVar3 = "c";',
      ].join('\n'));
      const report = assessProject(dir, makeStack());
      const gs = report.findings.find((f) => f.title === 'Global state usage');
      expect(gs).toBeDefined();
      expect(gs!.severity).toBe('medium');
    });

    it('flags JS without TypeScript', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.js', 'var x = 1;\n');
      const report = assessProject(dir, makeStack({
        language: 'javascript', hasTypeChecking: false,
      }));
      expect(report.findings.find(
        (f) => f.title === 'JavaScript without TypeScript',
      )).toBeDefined();
    });
  });

  describe('dependency collector — no devDependencies branch (line 112)', () => {
    it('flags no devDependencies when all deps are production and count > 0', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { express: '^4', lodash: '^4' },
        devDependencies: {},
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const noDevDeps = report.findings.find((f) => f.title === 'No devDependencies');
      expect(noDevDeps).toBeDefined();
      expect(noDevDeps!.severity).toBe('medium');
    });
  });

  describe('quality collector — no formatter branch (line 74)', () => {
    it('flags no code formatter when hasFormatting is false', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack({ hasFormatting: false }));
      const noFormatter = report.findings.find((f) => f.title === 'No code formatter');
      expect(noFormatter).toBeDefined();
      expect(noFormatter!.severity).toBe('medium');
    });
  });

  describe('quality collector — no type checking branch (line 64)', () => {
    it('flags no type checking when hasTypeChecking is false', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack({ hasTypeChecking: false }));
      const noType = report.findings.find((f) => f.title === 'No type checking');
      expect(noType).toBeDefined();
      expect(noType!.severity).toBe('high');
    });
  });

  describe('migration readiness — catch block for unreadable files (line 87)', () => {
    it('skips unreadable files without throwing during global state scan', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'src/index.ts', 'window.globalA = 1;\n');

      // Create an unreadable file
      const unreadablePath = join(dir, 'src/unreadable.ts');
      writeFile(dir, 'src/unreadable.ts', 'window.x = 1;\n');
      chmodSync(unreadablePath, 0o000);

      let report: ReturnType<typeof assessProject>;
      try {
        report = assessProject(dir, makeStack({ language: 'javascript' }));
      } finally {
        chmodSync(unreadablePath, 0o644);
      }

      // Should not throw; unreadable file is skipped gracefully
      expect(Array.isArray(report!.findings)).toBe(true);
    });
  });

  describe('dependency collector — high severity legacy packages (line 70)', () => {
    it('flags angular as high severity legacy dependency', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { angular: '^1.8.0' },
        devDependencies: { jest: '^29' },
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const angularFinding = report.findings.find(
        (f) => f.category === 'dependencies' && f.title.includes('angular'),
      );
      expect(angularFinding).toBeDefined();
      expect(angularFinding!.severity).toBe('high');
    });

    it('flags backbone as high severity legacy dependency', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      writeFile(dir, 'package.json', JSON.stringify({
        dependencies: { backbone: '^1.4.0' },
        devDependencies: { jest: '^29' },
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      const backboneFinding = report.findings.find(
        (f) => f.category === 'dependencies' && f.title.includes('backbone'),
      );
      expect(backboneFinding).toBeDefined();
      expect(backboneFinding!.severity).toBe('high');
    });
  });

  describe('dependency collector — package.json without dependencies key (lines 31-34)', () => {
    it('handles package.json with no dependencies or devDependencies keys', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      // package.json without "dependencies" or "devDependencies" keys
      writeFile(dir, 'package.json', JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      // Should not throw; deps defaults to {} via ?? operator
      const report = assessProject(dir, makeStack());
      expect(Array.isArray(report.findings)).toBe(true);
      // depCount = 0, devDepCount = 0 → no devDependencies finding (condition: devDepCount === 0 && depCount > 0)
      expect(report.findings.find((f) => f.title === 'No devDependencies')).toBeUndefined();
    });
  });

  describe('migration collector — package.json without dependencies key (lines 26-27)', () => {
    it('handles package.json with no dependencies key in migration check', () => {
      writeFile(dir, '.gitignore', '.env\n');
      writeFile(dir, 'package-lock.json', '{}');
      // package.json without "dependencies" key — allDeps uses ?? {} fallback
      writeFile(dir, 'package.json', JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
        engines: { node: '>=18' },
      }));
      writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
      const report = assessProject(dir, makeStack());
      // No legacy stack findings should appear since deps is empty
      const legacyFindings = report.findings.filter(
        (f) => f.category === 'migration-readiness' && f.title.startsWith('Legacy stack'),
      );
      expect(legacyFindings).toHaveLength(0);
    });
  });

  describe('quality collector — zero sourceFiles branch (line 36)', () => {
    it('handles project with only test files and no source files (sourceFiles=0 → testRatio=0)', () => {
      writeFile(dir, '.gitignore', '.env\n');
      // Only a test file, no non-test source files → sourceFiles = 0 → testRatio = 0 branch
      writeFile(dir, 'src/__tests__/only.test.ts', 'test("x", () => {});\n');
      const report = assessProject(dir, makeStack());
      // Should not throw; testRatio = 0 handled gracefully (no "Very low test coverage" since ratio = 0 / 0 = 0 fallback)
      expect(Array.isArray(report.findings)).toBe(true);
    });
  });
});

// ─── collectSecurityFindings — direct unit tests for uncovered branches ───────

describe('collectSecurityFindings', () => {
  let dir: string;

  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  // line 93: catch block — skip unreadable files gracefully
  it('skips unreadable files without throwing (line 93 catch)', () => {
    const filePath = join(dir, '.gitignore');
    writeFileSync(filePath, '.env\n');

    // Create a file then make it unreadable
    const secretFile = join(dir, 'secret.ts');
    writeFileSync(secretFile, 'const password = "hunter2";\n');
    chmodSync(secretFile, 0o000);

    let findings: ReturnType<typeof collectSecurityFindings>;
    try {
      findings = collectSecurityFindings(dir, [secretFile]);
    } finally {
      // Restore permissions so cleanup works
      chmodSync(secretFile, 0o644);
    }

    // Should not throw; the unreadable file is skipped
    expect(Array.isArray(findings!)).toBe(true);
  });

  // lines 101-111: secretCount cap at 10 — more than 10 secret matches
  it('caps secret findings at 10 (lines 101-111)', () => {
    writeFileSync(join(dir, '.gitignore'), '.env\n');

    // Each line matches the hardcoded-secret pattern: keyword `token` + value
    // Use a single file with 15 separate token assignments (each on its own line)
    const lines = Array.from(
      { length: 15 },
      (_, i) => `const token = "supersecret${String(i).padStart(4, '0')}";`,
    ).join('\n');
    const sourceFile = join(dir, 'leaked.ts');
    writeFileSync(sourceFile, lines);

    const findings = collectSecurityFindings(dir, [sourceFile]);
    const secretFindings = findings.filter((f) => f.title === 'Hardcoded secret');

    // The loop breaks at 10 so we should never exceed 10 secret findings
    expect(secretFindings.length).toBeLessThanOrEqual(10);
    expect(secretFindings.length).toBeGreaterThan(0);
  });
});
