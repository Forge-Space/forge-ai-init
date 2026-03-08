import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanProject } from '../src/scanner.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-scan-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, name: string, content: string): void {
  const path = join(dir, name);
  const parent = path.substring(0, path.lastIndexOf('/'));
  mkdirSync(parent, { recursive: true });
  writeFileSync(path, content);
}

describe('scanProject', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns A grade for clean project', () => {
    writeFile(dir, 'src/index.ts', 'export const hello = "world";\n');
    const report = scanProject(dir);
    expect(report.grade).toBe('A');
    expect(report.score).toBe(100);
    expect(report.filesScanned).toBe(1);
  });

  it('detects empty catch blocks', () => {
    writeFile(dir, 'app.ts', `
try {
  doSomething();
} catch (e) {}
`);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'empty-catch');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects hardcoded secrets', () => {
    writeFile(dir, 'config.ts', `
const password = "supersecret123";
`);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'hardcoded-secret');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
  });

  it('detects @ts-ignore', () => {
    writeFile(dir, 'hack.ts', `
// @ts-ignore
const x: number = "not a number";
`);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'ts-suppress');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects god files (>500 lines)', () => {
    const lines = Array.from({ length: 501 }, (_, i) =>
      `export const x${i} = ${i};`
    ).join('\n');
    writeFile(dir, 'big.ts', lines);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'god-file');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects large files (300-500 lines)', () => {
    const lines = Array.from({ length: 350 }, (_, i) =>
      `export const x${i} = ${i};`
    ).join('\n');
    writeFile(dir, 'medium.ts', lines);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'large-file');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('skips node_modules', () => {
    // Note: eval string in test data is intentional — testing scanner detection
    writeFile(dir, 'node_modules/bad/index.js', 'const x = Function("return 1")();');
    writeFile(dir, 'src/clean.ts', 'export const x = 1;\n');
    const report = scanProject(dir);
    expect(report.filesScanned).toBe(1);
  });

  it('scans multiple file types', () => {
    writeFile(dir, 'app.js', 'const x = 1;\n');
    writeFile(dir, 'main.py', 'x = 1\n');
    writeFile(dir, 'lib.tsx', 'export default () => null;\n');
    const report = scanProject(dir);
    expect(report.filesScanned).toBe(3);
  });

  it('provides category summary', () => {
    writeFile(dir, 'bad.ts', `
try { x(); } catch (e) {}
const token = "secret12345678";
`);
    const report = scanProject(dir);
    expect(report.summary.length).toBeGreaterThan(0);
    for (const cat of report.summary) {
      expect(cat.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('provides top files ranking', () => {
    writeFile(dir, 'a.ts', 'try { x(); } catch (e) {}\n'.repeat(5));
    writeFile(dir, 'b.ts', 'export const x = 1;\n');
    const report = scanProject(dir);
    expect(report.topFiles.length).toBeGreaterThanOrEqual(1);
    expect(report.topFiles[0]!.file).toBe('a.ts');
  });

  it('respects maxFiles limit', () => {
    for (let i = 0; i < 10; i++) {
      writeFile(dir, `file${i}.ts`, `export const x = ${i};\n`);
    }
    const report = scanProject(dir, 3);
    expect(report.filesScanned).toBe(3);
  });

  it('returns JSON-serializable report', () => {
    writeFile(dir, 'app.ts', 'try { x(); } catch (e) {}\n');
    const report = scanProject(dir);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.grade).toBeDefined();
    expect(parsed.score).toBeDefined();
    expect(parsed.findings).toBeInstanceOf(Array);
  });

  it('detects async function inside Promise constructor', () => {
    writeFile(dir, 'src/async.ts', 'const p = new Promise(async (resolve) => {\n  resolve(1);\n});');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'promise-constructor-async');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('async');
    expect(finding!.severity).toBe('high');
  });

  it('detects deep promise chains', () => {
    writeFile(dir, 'src/chain.ts', 'fetch("/api").then((r) => r.json()).then((d) => d.value).then((v) => v);');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'promise-chain');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('async');
  });

  it('detects setTimeout with zero delay', () => {
    writeFile(dir, 'src/timer.ts', 'setTimeout(doSomething, 0);');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'setTimeout-zero');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('async');
  });

  it('detects explicit any type', () => {
    writeFile(dir, 'src/types.ts', 'function process(data: any): void {}');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'any-type');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('type-safety');
  });

  it('detects type assertions', () => {
    writeFile(dir, 'src/assert.ts', 'const el = document.getElementById("app") as HTMLDivElement;');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'type-assertion');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('type-safety');
  });

  it('detects non-null assertions', () => {
    writeFile(dir, 'src/bang.ts', 'const value = map.get("key")!.toString();');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'non-null-assertion');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('type-safety');
  });

  it('detects innerHTML assignment', () => {
    writeFile(dir, 'src/dom.ts', 'element.innerHTML = userInput;');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'innerHTML-assignment');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('security');
  });

  it('detects SQL string concatenation', () => {
    writeFile(dir, 'src/db.ts', 'const query = "SELECT * FROM users WHERE id = " + userId;');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'sql-concatenation');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
    expect(finding!.category).toBe('security');
  });

  it('detects console.log statements', () => {
    writeFile(dir, 'src/debug.ts', 'console.log("debugging");\nconsole.debug("more");');
    const report = scanProject(dir);
    const findings = report.findings.filter(f => f.rule === 'console-log');
    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings[0]!.category).toBe('engineering');
  });

  it('detects TODO/FIXME markers', () => {
    writeFile(dir, 'src/wip.ts', '// TODO: refactor this\n// FIXME: broken\nconst x = 1;');
    const report = scanProject(dir);
    const findings = report.findings.filter(f => f.rule === 'todo-marker');
    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings[0]!.category).toBe('engineering');
  });

  it('detects full lodash imports', () => {
    writeFile(dir, 'src/utils.ts', "import _ from 'lodash';\nconst sorted = _.sortBy(items, 'name');");
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'lodash-full-import');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('scalability');
  });

  it('detects forEach + push pattern', () => {
    writeFile(dir, 'src/loop.ts', 'items.forEach(item => results.push(item.name));');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'forEach-push');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('engineering');
  });

  it('detects unsafe HTML usage in JSX', () => {
    writeFile(dir, 'src/comp.tsx', '<div dangerouslySetInnerHTML={{ __html: html }} />');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'unsafe-html');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects hardcoded URLs', () => {
    writeFile(dir, 'src/api.ts', 'const API_URL = "https://api.myservice.com/v1";');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'hardcoded-url');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('hardcoded-values');
  });

  it('detects console-only catch blocks', () => {
    writeFile(dir, 'src/handler.ts', 'try {\n  riskyOp();\n} catch (e) {\n  console.error(e);\n}');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'console-only-catch');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('does not fire TS rules on Python files', () => {
    writeFile(dir, 'src/app.py', 'x: any = 42\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'any-type');
    expect(finding).toBeUndefined();
  });

  it('detects bare except in Python', () => {
    writeFile(dir, 'src/handler.py', 'try:\n    do_work()\nexcept:\n    pass\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'bare-except');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('error-handling');
  });

  it('detects except Exception: pass in Python', () => {
    writeFile(dir, 'src/silent.py', 'try:\n    risky()\nexcept Exception as e:\n    pass\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'except-pass');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects subprocess shell=True in Python', () => {
    writeFile(dir, 'src/cmd.py', 'subprocess.run(cmd, shell=True)\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'subprocess-shell');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('security');
  });

  it('detects pickle usage in Python', () => {
    writeFile(dir, 'src/data.py', 'import pickle\ndata = pickle.loads(raw)\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'pickle-usage');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('security');
  });

  it('detects SQL format string in Python', () => {
    writeFile(dir, 'src/db.py', 'query = "SELECT * FROM users WHERE id = {}".format(user_id)\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'sql-format-string');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('security');
  });

  it('detects typing.Any import in Python', () => {
    writeFile(dir, 'src/types.py', 'from typing import Any, Dict\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'python-any-type');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('type-safety');
  });

  it('detects type: ignore in Python', () => {
    writeFile(dir, 'src/hack.py', 'result = bad_function()  # type: ignore\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'type-ignore');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects wildcard import in Python', () => {
    writeFile(dir, 'src/views.py', 'from django.shortcuts import *\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'wildcard-import');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('detects global variable in Python', () => {
    writeFile(dir, 'src/state.py', 'def update():\n    global counter\n    counter += 1\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'global-variable');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('architecture');
  });

  it('detects mutable default argument in Python', () => {
    writeFile(dir, 'src/func.py', 'def add_item(item, items=[]):\n    items.append(item)\n    return items\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'mutable-default-arg');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects assert in production Python code', () => {
    writeFile(dir, 'src/validate.py', 'assert user.is_active\nprocess(user)\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'assert-in-production');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('counts Python def functions for function-sprawl', () => {
    const defs = Array.from({ length: 16 }, (_, i) =>
      `def func_${i}():\n    pass\n`
    ).join('\n');
    writeFile(dir, 'src/sprawl.py', defs);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'function-sprawl');
    expect(finding).toBeDefined();
  });
});
