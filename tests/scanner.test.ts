import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  scanProject,
  scanSpecificFiles,
} from '../src/scanner.js';

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

  it('detects Go panic usage', () => {
    writeFile(dir, 'src/main.go', 'func init() {\n    panic("failed to start")\n}\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'go-panic');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('error-handling');
  });

  it('detects Go empty interface', () => {
    writeFile(dir, 'src/handler.go', 'func process(data interface{}) {}\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'go-empty-interface');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('type-safety');
  });

  it('detects Go goroutine leak risk', () => {
    writeFile(dir, 'src/async.go', 'go func() {\n    doWork()\n}()\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'go-goroutine-leak');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('async');
  });

  it('detects Go blank import', () => {
    writeFile(dir, 'src/init.go', 'import _ "github.com/lib/pq"\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'go-blank-import');
    expect(finding).toBeDefined();
  });

  it('detects Rust unwrap', () => {
    writeFile(dir, 'src/main.rs', 'let value = result.unwrap();\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'rust-unwrap');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('error-handling');
  });

  it('detects Rust unsafe block', () => {
    writeFile(dir, 'src/ffi.rs', 'unsafe.deref(ptr);\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'rust-unsafe');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('security');
  });

  it('detects Rust todo! macro', () => {
    writeFile(dir, 'src/lib.rs', 'fn process() {\n    todo!()\n}\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'rust-todo-macro');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('engineering');
  });

  it('detects Rust clone usage', () => {
    writeFile(dir, 'src/data.rs', 'let copy = original.clone();\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'rust-clone');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('low');
  });

  it('detects Rust expect', () => {
    writeFile(dir, 'src/io.rs', 'let file = File::open("data.txt").expect("failed to open");\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'rust-expect');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('detects Svelte raw HTML', () => {
    writeFile(dir, 'src/Page.svelte', '<div>{@html userContent}</div>\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'svelte-raw-html');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
    expect(finding!.category).toBe('security');
  });

  it('counts Go func for function-sprawl', () => {
    const funcs = Array.from({ length: 16 }, (_, i) =>
      `func handler${i}() {}\n`
    ).join('\n');
    writeFile(dir, 'src/routes.go', funcs);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'function-sprawl');
    expect(finding).toBeDefined();
  });

  it('counts Rust fn for function-sprawl', () => {
    const funcs = Array.from({ length: 16 }, (_, i) =>
      `fn process_${i}() {}\n`
    ).join('\n');
    writeFile(dir, 'src/handlers.rs', funcs);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'function-sprawl');
    expect(finding).toBeDefined();
  });

  it('does not fire Go rules on TypeScript files', () => {
    writeFile(dir, 'src/app.ts', 'const panic = () => { throw new Error("fail"); };\npanic();\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'go-panic');
    expect(finding).toBeUndefined();
  });
});

describe('scanSpecificFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('scans only specified files', () => {
    writeFile(dir, 'src/clean.ts', 'const x = 1;\n');
    writeFile(dir, 'src/dirty.ts', 'try { x() } catch (e) {}\n');
    const report = scanSpecificFiles(dir, ['src/dirty.ts']);
    expect(report.filesScanned).toBe(1);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings[0].rule).toBe('empty-catch');
  });

  it('returns empty report for no files', () => {
    const report = scanSpecificFiles(dir, []);
    expect(report.filesScanned).toBe(0);
    expect(report.findings).toHaveLength(0);
    expect(report.grade).toBe('A');
  });

  it('filters non-code files', () => {
    writeFile(dir, 'README.md', '# Hello\n');
    writeFile(dir, 'src/app.ts', 'try { x() } catch (e) {}\n');
    const report = scanSpecificFiles(
      dir,
      ['README.md', 'src/app.ts'],
    );
    expect(report.filesScanned).toBe(1);
  });

  it('handles missing files gracefully', () => {
    const report = scanSpecificFiles(
      dir,
      ['nonexistent.ts'],
    );
    expect(report.filesScanned).toBe(1);
    expect(report.findings).toHaveLength(0);
  });

  it('applies language-aware rules to specific files', () => {
    writeFile(dir, 'src/main.go', 'func main() {\n\tpanic("oops")\n}\n');
    const report = scanSpecificFiles(dir, ['src/main.go']);
    const finding = report.findings.find(
      f => f.rule === 'go-panic',
    );
    expect(finding).toBeDefined();
  });
});

describe('Java scanner rules', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects System.out.println', () => {
    writeFile(dir, 'src/App.java', 'System.out.println("debug");\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'java-sysout');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('detects raw JDBC Statement', () => {
    writeFile(
      dir,
      'src/Dao.java',
      'Statement stmt = conn.createStatement();\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'java-raw-statement');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
  });

  it('detects @SuppressWarnings', () => {
    writeFile(
      dir,
      'src/App.java',
      '@SuppressWarnings("unchecked")\npublic void foo() {}\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'java-suppress-warnings',
    );
    expect(finding).toBeDefined();
  });

  it('detects Thread.sleep', () => {
    writeFile(dir, 'src/App.java', 'Thread.sleep(1000);\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'java-thread-sleep');
    expect(finding).toBeDefined();
  });

  it('detects hardcoded credentials', () => {
    writeFile(
      dir,
      'src/Config.java',
      'String password = "hunter2";\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'java-hardcoded-credential',
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
  });

  it('detects legacy Date usage', () => {
    writeFile(dir, 'src/App.java', 'Date now = new Date();\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'java-legacy-date');
    expect(finding).toBeDefined();
  });

  it('detects empty catch blocks', () => {
    writeFile(
      dir,
      'src/App.java',
      'try { foo(); } catch (Exception e) {}\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'java-empty-catch');
    expect(finding).toBeDefined();
  });

  it('detects printStackTrace', () => {
    writeFile(
      dir,
      'src/App.java',
      'catch (Exception e) { e.printStackTrace(); }\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'java-print-stacktrace',
    );
    expect(finding).toBeDefined();
  });

  it('does not fire Java rules on .ts files', () => {
    writeFile(dir, 'src/app.ts', 'System.out.println("test");\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'java-sysout');
    expect(finding).toBeUndefined();
  });
});

describe('Kotlin scanner rules', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects !! non-null assertion', () => {
    writeFile(dir, 'src/App.kt', 'val name = user!!.name\n');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'kotlin-non-null-assertion',
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects runBlocking', () => {
    writeFile(dir, 'src/App.kt', 'runBlocking {\n  doWork()\n}\n');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'kotlin-run-blocking',
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects empty catch blocks', () => {
    writeFile(
      dir,
      'src/App.kt',
      'try { foo() } catch (e: Exception) {}\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'kotlin-empty-catch',
    );
    expect(finding).toBeDefined();
  });

  it('detects @Suppress annotation', () => {
    writeFile(
      dir,
      'src/App.kt',
      '@Suppress("UNCHECKED_CAST")\nfun foo() {}\n',
    );
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'kotlin-suppress');
    expect(finding).toBeDefined();
  });

  it('detects TODO markers', () => {
    writeFile(dir, 'src/App.kt', 'TODO("implement this")\n');
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'kotlin-todo');
    expect(finding).toBeDefined();
  });

  it('scans .kts files', () => {
    writeFile(dir, 'build.gradle.kts', 'runBlocking {\n  task()\n}\n');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'kotlin-run-blocking',
    );
    expect(finding).toBeDefined();
  });

  it('does not fire Kotlin rules on .java files', () => {
    writeFile(dir, 'src/App.java', 'val name = user!!.name\n');
    const report = scanProject(dir);
    const finding = report.findings.find(
      f => f.rule === 'kotlin-non-null-assertion',
    );
    expect(finding).toBeUndefined();
  });
});
