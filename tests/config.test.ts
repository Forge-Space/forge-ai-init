import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  isRuleDisabled,
  getRuleSeverity,
  isCategoryEnabled,
  isFileIgnored,
  getThreshold,
} from '../src/config.js';
import { scanProject } from '../src/scanner.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-cfg-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(
  dir: string,
  name: string,
  content: string,
): void {
  const path = join(dir, name);
  const parent = path.substring(0, path.lastIndexOf('/'));
  mkdirSync(parent, { recursive: true });
  writeFileSync(path, content);
}

describe('loadConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty config when no file exists', () => {
    const config = loadConfig(dir);
    expect(config).toEqual({});
  });

  it('loads .forgerc.json', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({ maxFiles: 100 }),
    );
    const config = loadConfig(dir);
    expect(config.maxFiles).toBe(100);
  });

  it('loads .forgerc', () => {
    writeFile(
      dir,
      '.forgerc',
      JSON.stringify({ maxFiles: 200 }),
    );
    const config = loadConfig(dir);
    expect(config.maxFiles).toBe(200);
  });

  it('loads forge.config.json', () => {
    writeFile(
      dir,
      'forge.config.json',
      JSON.stringify({ maxFiles: 300 }),
    );
    const config = loadConfig(dir);
    expect(config.maxFiles).toBe(300);
  });

  it('prefers .forgerc.json over .forgerc', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({ maxFiles: 100 }),
    );
    writeFile(
      dir,
      '.forgerc',
      JSON.stringify({ maxFiles: 200 }),
    );
    const config = loadConfig(dir);
    expect(config.maxFiles).toBe(100);
  });

  it('resolves strict preset', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({ extends: 'strict' }),
    );
    const config = loadConfig(dir);
    expect(config.thresholds?.commit).toBe(80);
    expect(config.thresholds?.deploy).toBe(90);
  });

  it('resolves lenient preset with disabled rules', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({ extends: 'lenient' }),
    );
    const config = loadConfig(dir);
    expect(config.thresholds?.commit).toBe(40);
    expect(config.rules?.['console-log']).toBe(false);
  });

  it('merges user overrides with preset', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({
        extends: 'strict',
        thresholds: { commit: 70 },
      }),
    );
    const config = loadConfig(dir);
    expect(config.thresholds?.commit).toBe(70);
    expect(config.thresholds?.deploy).toBe(90);
  });

  it('handles malformed JSON gracefully', () => {
    writeFile(dir, '.forgerc.json', '{ broken json');
    const config = loadConfig(dir);
    expect(config).toEqual({});
  });
});

describe('rule helpers', () => {
  it('isRuleDisabled returns true for false', () => {
    expect(
      isRuleDisabled({ rules: { 'console-log': false } }, 'console-log'),
    ).toBe(true);
  });

  it('isRuleDisabled returns true for disabled flag', () => {
    expect(
      isRuleDisabled(
        { rules: { 'console-log': { disabled: true } } },
        'console-log',
      ),
    ).toBe(true);
  });

  it('isRuleDisabled returns false for enabled rule', () => {
    expect(
      isRuleDisabled(
        { rules: { 'console-log': { severity: 'high' } } },
        'console-log',
      ),
    ).toBe(false);
  });

  it('getRuleSeverity returns override', () => {
    expect(
      getRuleSeverity(
        { rules: { 'console-log': { severity: 'critical' } } },
        'console-log',
        'low',
      ),
    ).toBe('critical');
  });

  it('getRuleSeverity returns default for disabled', () => {
    expect(
      getRuleSeverity(
        { rules: { 'console-log': false } },
        'console-log',
        'low',
      ),
    ).toBe('low');
  });

  it('isCategoryEnabled defaults to true', () => {
    expect(isCategoryEnabled({}, 'security')).toBe(true);
  });

  it('isCategoryEnabled respects disabled', () => {
    expect(
      isCategoryEnabled(
        { categories: { security: { enabled: false } } },
        'security',
      ),
    ).toBe(false);
  });
});

describe('file ignore', () => {
  it('ignores exact match', () => {
    expect(
      isFileIgnored({ ignore: ['legacy/old.ts'] }, 'legacy/old.ts'),
    ).toBe(true);
  });

  it('ignores prefix match', () => {
    expect(
      isFileIgnored({ ignore: ['legacy/'] }, 'legacy/old.ts'),
    ).toBe(true);
  });

  it('ignores wildcard match', () => {
    expect(
      isFileIgnored({ ignore: ['*.test.*'] }, 'foo.test.ts'),
    ).toBe(false);
    expect(
      isFileIgnored({ ignore: ['legacy/*'] }, 'legacy/file.ts'),
    ).toBe(true);
  });

  it('does not ignore non-matching', () => {
    expect(
      isFileIgnored({ ignore: ['legacy/'] }, 'src/app.ts'),
    ).toBe(false);
  });
});

describe('thresholds', () => {
  it('returns threshold for gate', () => {
    expect(
      getThreshold({ thresholds: { commit: 60 } }, 'commit'),
    ).toBe(60);
  });

  it('returns undefined when not set', () => {
    expect(getThreshold({}, 'commit')).toBeUndefined();
  });
});

describe('scanner with config', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('disables rules via config', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({
        rules: { 'empty-catch': false },
      }),
    );
    writeFile(dir, 'src/app.ts', 'try { x(); } catch (e) {}');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'empty-catch',
    );
    expect(finding).toBeUndefined();
  });

  it('changes severity via config', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({
        rules: { 'empty-catch': { severity: 'low' } },
      }),
    );
    writeFile(dir, 'src/app.ts', 'try { x(); } catch (e) {}');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'empty-catch',
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('low');
  });

  it('disables entire category via config', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({
        categories: {
          'error-handling': { enabled: false },
        },
      }),
    );
    writeFile(dir, 'src/app.ts', 'try { x(); } catch (e) {}');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.category === 'error-handling',
    );
    expect(finding).toBeUndefined();
  });

  it('ignores files via config', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({
        ignore: ['src/legacy/'],
      }),
    );
    writeFile(
      dir,
      'src/legacy/old.ts',
      'try { x(); } catch (e) {}',
    );
    writeFile(dir, 'src/app.ts', 'export const x = 1;\n');
    const report = scanProject(dir);
    expect(report.findings.length).toBe(0);
  });

  it('respects maxFiles from config', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({ maxFiles: 2 }),
    );
    for (let i = 0; i < 5; i++) {
      writeFile(
        dir,
        `src/file${i}.ts`,
        `export const x = ${i};\n`,
      );
    }
    const report = scanProject(dir);
    expect(report.filesScanned).toBe(2);
  });

  it('uses lenient preset to disable console-log', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({ extends: 'lenient' }),
    );
    writeFile(
      dir,
      'src/app.ts',
      'console.log("debug");\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'console-log',
    );
    expect(finding).toBeUndefined();
  });
});
