import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assessProject } from '../src/assessor.js';
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
});
