import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  saveBaseline,
  compareBaseline,
  loadBaseline,
  type BaselineData,
} from '../src/baseline.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-bl-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, name: string, content: string): void {
  const path = join(dir, name);
  const parent = path.substring(0, path.lastIndexOf('/'));
  mkdirSync(parent, { recursive: true });
  writeFileSync(path, content);
}

describe('baseline', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('loadBaseline', () => {
    it('returns null when no baseline exists', () => {
      expect(loadBaseline(dir)).toBeNull();
    });

    it('loads existing baseline file', () => {
      const data: BaselineData = {
        version: 1,
        history: [
          {
            timestamp: '2026-01-01T00:00:00.000Z',
            score: 85,
            grade: 'B',
            filesScanned: 10,
            findingCount: 5,
            categories: [],
          },
        ],
      };
      mkdirSync(join(dir, '.forge'), { recursive: true });
      writeFileSync(
        join(dir, '.forge', 'baseline.json'),
        JSON.stringify(data),
      );
      expect(loadBaseline(dir)).toEqual(data);
    });

    it('returns null for malformed JSON', () => {
      mkdirSync(join(dir, '.forge'), { recursive: true });
      writeFileSync(join(dir, '.forge', 'baseline.json'), '{bad json');
      expect(loadBaseline(dir)).toBeNull();
    });
  });

  describe('saveBaseline', () => {
    it('creates .forge dir and baseline.json on first save', () => {
      writeFile(dir, 'src/app.ts', 'const x = 1;');
      const { entry, isFirst } = saveBaseline(dir);

      expect(isFirst).toBe(true);
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.grade).toMatch(/^[A-F]$/);
      expect(entry.timestamp).toBeTruthy();

      const saved = loadBaseline(dir);
      expect(saved).not.toBeNull();
      expect(saved!.history).toHaveLength(1);
    });

    it('appends to existing history', () => {
      writeFile(dir, 'src/app.ts', 'const x = 1;');
      saveBaseline(dir);
      const { isFirst } = saveBaseline(dir);

      expect(isFirst).toBe(false);
      const saved = loadBaseline(dir);
      expect(saved!.history).toHaveLength(2);
    });

    it('records finding count from scan', () => {
      writeFile(
        dir,
        'src/bad.ts',
        'try { foo(); } catch (e) {}\nconst secret = "sk-1234567890abcdef";',
      );
      const { entry } = saveBaseline(dir);
      expect(entry.findingCount).toBeGreaterThan(0);
    });
  });

  describe('compareBaseline', () => {
    it('returns null when no baseline exists', () => {
      writeFile(dir, 'src/app.ts', 'const x = 1;');
      expect(compareBaseline(dir)).toBeNull();
    });

    it('detects score improvement when findings are removed', () => {
      writeFile(
        dir,
        'src/app.ts',
        'try { foo(); } catch (e) {}\nconst secret = "sk-1234567890abcdef";',
      );
      saveBaseline(dir);

      writeFile(dir, 'src/app.ts', 'const x = 1;');
      const result = compareBaseline(dir);

      expect(result).not.toBeNull();
      expect(result!.scoreDelta).toBeGreaterThanOrEqual(0);
      expect(result!.resolvedFindings).toBeGreaterThan(0);
    });

    it('detects regression when findings are added', () => {
      writeFile(dir, 'src/app.ts', 'const x = 1;');
      saveBaseline(dir);

      writeFile(
        dir,
        'src/app.ts',
        'try { foo(); } catch (e) {}\nconst secret = "sk-1234567890abcdef";',
      );
      const result = compareBaseline(dir);

      expect(result).not.toBeNull();
      expect(result!.newFindings).toBeGreaterThan(0);
    });

    it('reports no changes when code is unchanged', () => {
      writeFile(dir, 'src/app.ts', 'const x = 1;');
      saveBaseline(dir);

      const result = compareBaseline(dir);
      expect(result).not.toBeNull();
      expect(result!.scoreDelta).toBe(0);
      expect(result!.newFindings).toBe(0);
      expect(result!.resolvedFindings).toBe(0);
    });

    it('tracks per-category changes', () => {
      writeFile(dir, 'src/app.ts', 'try { foo(); } catch (e) {}');
      saveBaseline(dir);

      writeFile(
        dir,
        'src/app.ts',
        'try { foo(); } catch (e) {}\nconst secret = "sk-1234567890abcdef";',
      );
      const result = compareBaseline(dir);

      expect(result).not.toBeNull();
      const securityChange = result!.categoryChanges.find(
        (c) => c.category === 'hardcoded-values',
      );
      if (securityChange) {
        expect(securityChange.delta).toBeGreaterThan(0);
      }
    });

    it('detects grade change', () => {
      writeFile(dir, 'src/app.ts', 'const x = 1;');
      saveBaseline(dir);

      const manyFindings = Array(20)
        .fill('try { foo(); } catch (e) {}')
        .join('\n');
      writeFile(dir, 'src/bad.ts', manyFindings);
      const result = compareBaseline(dir);

      expect(result).not.toBeNull();
      expect(result!.gradeChanged).toBeDefined();
    });
  });
});
