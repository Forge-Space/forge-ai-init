import { readFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import {
  CODE_EXTENSIONS,
  walkFiles,
  scoreToGrade,
} from './shared.js';
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
  extensions?: string[];
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
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /readFileSync|writeFileSync|appendFileSync|mkdirSync/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'sync-io',
    message: 'Synchronous I/O blocks the event loop',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /key\s*=\s*\{?\s*(?:index|i|idx)\s*\}?/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'index-as-key',
    message: 'Array index as React key causes rendering bugs',
    extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    category: 'security',
    severity: 'high',
    rule: 'unsafe-html',
    message: 'dangerouslySetInnerHTML — XSS risk',
    extensions: ['.tsx', '.jsx'],
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
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
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
    extensions: ['.tsx', '.jsx'],
  },
  {
    pattern:
      /useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState/g,
    category: 'react',
    severity: 'medium',
    rule: 'excessive-useState',
    message: '4+ useState calls — consolidate with useReducer or object state',
    extensions: ['.tsx', '.jsx'],
  },
  {
    pattern: /:\s*any\b/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'any-type',
    message: 'Explicit `any` type — use a specific type or `unknown`',
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /as\s+(?!const\b)\w+/g,
    category: 'type-safety',
    severity: 'low',
    rule: 'type-assertion',
    message: 'Type assertion — prefer type narrowing with guards',
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /!\./g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'non-null-assertion',
    message: 'Non-null assertion (!) — handle null case explicitly',
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /innerHTML\s*=/g,
    category: 'security',
    severity: 'high',
    rule: 'innerHTML-assignment',
    message: 'innerHTML assignment — XSS risk, use textContent or sanitize',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
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
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
  },
  {
    pattern: /\.forEach\s*\([^)]*=>[^)]*\.push\b/g,
    category: 'engineering',
    severity: 'low',
    rule: 'forEach-push',
    message: 'forEach + push pattern — use map/filter/reduce instead',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
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
  {
    pattern: /except\s*:/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'bare-except',
    message: 'Bare except catches all exceptions including SystemExit — catch specific exceptions',
    extensions: ['.py'],
  },
  {
    pattern: /except\s+Exception\s*(?:as\s+\w+\s*)?:\s*(?:pass|\.\.\.)/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'except-pass',
    message: 'except Exception: pass silently swallows all errors',
    extensions: ['.py'],
  },
  {
    pattern: /os\.system\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'os-system',
    message: 'os.system() — shell injection risk, use subprocess.run with shell=False',
    extensions: ['.py'],
  },
  {
    pattern: /subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True/g,
    category: 'security',
    severity: 'high',
    rule: 'subprocess-shell',
    message: 'subprocess with shell=True — shell injection risk',
    extensions: ['.py'],
  },
  {
    pattern: /from\s+pickle\s+import|import\s+pickle/g,
    category: 'security',
    severity: 'high',
    rule: 'pickle-usage',
    message: 'pickle deserialization is unsafe with untrusted data — use JSON or msgpack',
    extensions: ['.py'],
  },
  {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*\.format\s*\(/gi,
    category: 'security',
    severity: 'high',
    rule: 'sql-format-string',
    message: 'SQL with .format() — use parameterized queries to prevent injection',
    extensions: ['.py'],
  },
  {
    pattern: /from\s+typing\s+import\s+.*\bAny\b/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'python-any-type',
    message: 'typing.Any bypasses type checking — use specific types or Protocol',
    extensions: ['.py'],
  },
  {
    pattern: /#\s*type:\s*ignore/g,
    category: 'engineering',
    severity: 'high',
    rule: 'type-ignore',
    message: '# type: ignore suppresses type checking — fix the underlying type issue',
    extensions: ['.py'],
  },
  {
    pattern: /import\s+\*/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'wildcard-import',
    message: 'Wildcard import pollutes namespace — import specific names',
    extensions: ['.py'],
  },
  {
    pattern: /global\s+\w+/g,
    category: 'architecture',
    severity: 'medium',
    rule: 'global-variable',
    message: 'Global variable mutation — use function parameters or class state',
    extensions: ['.py'],
  },
  {
    pattern: /def\s+\w+\([^)]*=\s*\[\]|def\s+\w+\([^)]*=\s*\{\}/g,
    category: 'engineering',
    severity: 'high',
    rule: 'mutable-default-arg',
    message: 'Mutable default argument — use None and create inside function',
    extensions: ['.py'],
  },
  {
    pattern: /^assert\s+/gm,
    category: 'engineering',
    severity: 'medium',
    rule: 'assert-in-production',
    message: 'assert is stripped with -O flag — use proper validation for production code',
    extensions: ['.py'],
  },
  {
    pattern: /if\s+err\s*!=\s*nil\s*\{\s*return\s+(?:nil,\s*)?err\s*\}/g,
    category: 'error-handling',
    severity: 'medium',
    rule: 'go-bare-error-return',
    message: 'Bare error return without wrapping — use fmt.Errorf or errors.Wrap for context',
    extensions: ['.go'],
  },
  {
    pattern: /panic\s*\(/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'go-panic',
    message: 'panic() crashes the program — return errors instead',
    extensions: ['.go'],
  },
  {
    pattern: /interface\s*\{\s*\}/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'go-empty-interface',
    message: 'Empty interface{} loses type safety — use generics or specific types',
    extensions: ['.go'],
  },
  {
    pattern: /\.\s*Exec\s*\(\s*["'`].*\+/g,
    category: 'security',
    severity: 'critical',
    rule: 'go-sql-concat',
    message: 'SQL concatenation in Exec — use parameterized queries',
    extensions: ['.go'],
  },
  {
    pattern: /import\s+_\s+"/g,
    category: 'engineering',
    severity: 'low',
    rule: 'go-blank-import',
    message: 'Blank import for side effects — document why with a comment',
    extensions: ['.go'],
  },
  {
    pattern: /var\s+\w+\s+sync\.Mutex/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'go-global-mutex',
    message: 'Global mutex — consider channel-based concurrency or sync.RWMutex',
    extensions: ['.go'],
  },
  {
    pattern: /go\s+func\s*\(/g,
    category: 'async',
    severity: 'medium',
    rule: 'go-goroutine-leak',
    message: 'Anonymous goroutine — ensure proper lifecycle management and error handling',
    extensions: ['.go'],
  },
  {
    pattern: /unsafe\./g,
    category: 'security',
    severity: 'high',
    rule: 'rust-unsafe',
    message: 'unsafe block — minimize scope and document safety invariants',
    extensions: ['.rs'],
  },
  {
    pattern: /\.unwrap\s*\(\s*\)/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'rust-unwrap',
    message: '.unwrap() panics on error — use ? operator or handle the error',
    extensions: ['.rs'],
  },
  {
    pattern: /\.expect\s*\(/g,
    category: 'error-handling',
    severity: 'medium',
    rule: 'rust-expect',
    message: '.expect() panics with message — prefer ? operator in production code',
    extensions: ['.rs'],
  },
  {
    pattern: /\.clone\s*\(\s*\)/g,
    category: 'scalability',
    severity: 'low',
    rule: 'rust-clone',
    message: '.clone() copies data — consider borrowing or Arc for shared ownership',
    extensions: ['.rs'],
  },
  {
    pattern: /todo!\s*\(|unimplemented!\s*\(/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'rust-todo-macro',
    message: 'todo!/unimplemented! panics at runtime — implement before shipping',
    extensions: ['.rs'],
  },
  {
    pattern: /allow\s*\(\s*(?:clippy::|unused|dead_code)/g,
    category: 'engineering',
    severity: 'low',
    rule: 'rust-allow-lint',
    message: 'Lint suppression — fix the warning instead of suppressing it',
    extensions: ['.rs'],
  },
  {
    pattern: /\{@html\s/g,
    category: 'security',
    severity: 'high',
    rule: 'svelte-raw-html',
    message: '{@html} renders unescaped HTML — XSS risk, sanitize first',
    extensions: ['.svelte'],
  },
  {
    pattern: /on:\w+\s*=\s*\{[^}]*\$\s*:/g,
    category: 'react',
    severity: 'medium',
    rule: 'svelte-reactive-event',
    message: 'Reactive statement in event handler — may cause unexpected re-renders',
    extensions: ['.svelte'],
  },
  {
    pattern: /\$:\s*\{[\s\S]*?fetch\s*\(/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'svelte-reactive-fetch',
    message: 'Fetch in reactive block — may trigger on every state change, use onMount',
    extensions: ['.svelte'],
  },
  {
    pattern: /System\.(out|err)\.print(ln)?\s*\(/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'java-sysout',
    message: 'System.out/err.println — use a logging framework (SLF4J, Log4j)',
    extensions: ['.java'],
  },
  {
    pattern: /Statement\s*\w*\s*=|\.createStatement\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'java-raw-statement',
    message: 'Raw JDBC Statement — use PreparedStatement to prevent SQL injection',
    extensions: ['.java'],
  },
  {
    pattern: /@SuppressWarnings\s*\(/g,
    category: 'engineering',
    severity: 'low',
    rule: 'java-suppress-warnings',
    message: '@SuppressWarnings hides issues — fix the warning instead',
    extensions: ['.java'],
  },
  {
    pattern: /Thread\.sleep\s*\(/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'java-thread-sleep',
    message: 'Thread.sleep blocks the thread — use ScheduledExecutorService or async',
    extensions: ['.java'],
  },
  {
    pattern: /(?:password|secret|api[_-]?key)\s*=\s*"[^"]+"/gi,
    category: 'security',
    severity: 'critical',
    rule: 'java-hardcoded-credential',
    message: 'Hardcoded credential — use environment variables or a secrets manager',
    extensions: ['.java', '.properties', '.yml', '.yaml'],
  },
  {
    pattern: /new\s+Date\s*\(\s*\)|new\s+SimpleDateFormat\s*\(/g,
    category: 'engineering',
    severity: 'low',
    rule: 'java-legacy-date',
    message: 'Legacy Date/SimpleDateFormat — use java.time (LocalDate, DateTimeFormatter)',
    extensions: ['.java'],
  },
  {
    pattern: /catch\s*\(\s*\w+\s+\w+\s*\)\s*\{\s*\}/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'java-empty-catch',
    message: 'Empty catch block swallows exceptions silently',
    extensions: ['.java'],
  },
  {
    pattern: /\.printStackTrace\s*\(\s*\)/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'java-print-stacktrace',
    message: '.printStackTrace() — use a logger to capture exceptions',
    extensions: ['.java'],
  },
  {
    pattern: /!!/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'kotlin-non-null-assertion',
    message: '!! non-null assertion crashes on null — use safe calls or elvis operator',
    extensions: ['.kt', '.kts'],
  },
  {
    pattern: /runBlocking\s*\{/g,
    category: 'scalability',
    severity: 'high',
    rule: 'kotlin-run-blocking',
    message: 'runBlocking blocks the thread — use suspend functions or coroutineScope',
    extensions: ['.kt', '.kts'],
  },
  {
    pattern: /catch\s*\(\s*\w+\s*:\s*\w+\s*\)\s*\{\s*\}/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'kotlin-empty-catch',
    message: 'Empty catch block swallows exceptions silently',
    extensions: ['.kt', '.kts'],
  },
  {
    pattern: /@Suppress\s*\(/g,
    category: 'engineering',
    severity: 'low',
    rule: 'kotlin-suppress',
    message: '@Suppress hides issues — fix the warning instead',
    extensions: ['.kt', '.kts'],
  },
  {
    pattern: /TODO\s*\(|FIXME/g,
    category: 'engineering',
    severity: 'low',
    rule: 'kotlin-todo',
    message: 'TODO/FIXME marker — resolve before shipping',
    extensions: ['.kt', '.kts'],
  },
  // --- Svelte expansion (issue #2) ---
  {
    pattern: /\$:\s*\w+\s*=\s*\w+/g,
    category: 'engineering',
    severity: 'low',
    rule: 'svelte-reactive-assignment',
    message: 'Reactive declaration — ensure dependency tracking is intentional',
    extensions: ['.svelte'],
  },
  {
    pattern: /bind:(?:innerHTML|textContent)\s*=/g,
    category: 'security',
    severity: 'high',
    rule: 'svelte-bind-html',
    message: 'bind:innerHTML — XSS risk, sanitize content',
    extensions: ['.svelte'],
  },
  {
    pattern: /on:click\s*=\s*\{[^}]*(?:window|document)\./g,
    category: 'engineering',
    severity: 'medium',
    rule: 'svelte-global-dom-access',
    message: 'Direct DOM access in event handler — use Svelte actions or bind:this',
    extensions: ['.svelte'],
  },
  {
    pattern: /export\s+let\s+\w+\s*=\s*\[\]|export\s+let\s+\w+\s*=\s*\{\}/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'svelte-mutable-prop-default',
    message: 'Mutable default prop — shared reference between instances',
    extensions: ['.svelte'],
  },
  {
    pattern: /\$\$props/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'svelte-spread-props',
    message: '$$props breaks reactivity optimizations — declare props explicitly',
    extensions: ['.svelte'],
  },
  // --- Go expansion (issue #3) ---
  {
    pattern: /fmt\.Sprintf\s*\([^)]*%(?:s|v|d)[^)]*\+/g,
    category: 'security',
    severity: 'high',
    rule: 'go-format-injection',
    message: 'Dynamic format string — may enable format string injection',
    extensions: ['.go'],
  },
  {
    pattern: /init\s*\(\s*\)\s*\{/g,
    category: 'architecture',
    severity: 'medium',
    rule: 'go-init-function',
    message: 'init() has implicit execution order — prefer explicit initialization',
    extensions: ['.go'],
  },
  {
    pattern: /os\.Exit\s*\(/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'go-os-exit',
    message: 'os.Exit() skips deferred functions — return from main instead',
    extensions: ['.go'],
  },
  {
    pattern: /reflect\.\w+/g,
    category: 'scalability',
    severity: 'low',
    rule: 'go-reflect-usage',
    message: 'Reflection is slow and breaks type safety — use generics or interfaces',
    extensions: ['.go'],
  },
  {
    pattern: /http\.ListenAndServe\s*\(/g,
    category: 'security',
    severity: 'medium',
    rule: 'go-unencrypted-http',
    message: 'http.ListenAndServe without TLS — use ListenAndServeTLS in production',
    extensions: ['.go'],
  },
  // --- Rust expansion (issue #4) ---
  {
    pattern: /\.lock\(\)\.unwrap\(\)/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'rust-lock-unwrap',
    message: 'Mutex lock().unwrap() panics on poison — handle the PoisonError',
    extensions: ['.rs'],
  },
  {
    pattern: /std::mem::transmute/g,
    category: 'security',
    severity: 'critical',
    rule: 'rust-transmute',
    message: 'mem::transmute bypasses type system — use safe alternatives',
    extensions: ['.rs'],
  },
  {
    pattern: /Box::leak\s*\(/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'rust-box-leak',
    message: 'Box::leak creates permanent memory leak — ensure intentional',
    extensions: ['.rs'],
  },
  {
    pattern: /panic!\s*\(/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'rust-panic-macro',
    message: 'panic! crashes the program — return Result<T, E> instead',
    extensions: ['.rs'],
  },
  {
    pattern: /\.as_ptr\(\)/g,
    category: 'security',
    severity: 'medium',
    rule: 'rust-raw-pointer',
    message: 'as_ptr() creates raw pointer — ensure lifetime safety',
    extensions: ['.rs'],
  },
  // --- Python expansion (issue #7) ---
  {
    pattern: /\beval\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'python-eval',
    message: 'eval() runs arbitrary code — use ast.literal_eval or JSON parsing',
    extensions: ['.py'],
  },
  {
    pattern: /\bexec\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'python-exec',
    message: 'exec() runs arbitrary code — avoid dynamic code execution',
    extensions: ['.py'],
  },
  {
    pattern: /from\s+yaml\s+import|import\s+yaml[\s;]/g,
    category: 'security',
    severity: 'medium',
    rule: 'python-yaml-load',
    message: 'yaml.load without Loader is unsafe — use yaml.safe_load',
    extensions: ['.py'],
  },
  {
    pattern: /hashlib\.md5\s*\(|hashlib\.sha1\s*\(/g,
    category: 'security',
    severity: 'medium',
    rule: 'python-weak-hash',
    message: 'MD5/SHA1 are cryptographically weak — use SHA-256+',
    extensions: ['.py'],
  },
  {
    pattern: /from\s+\w+\s+import\s+\*/g,
    category: 'architecture',
    severity: 'medium',
    rule: 'python-star-import',
    message: 'Star import pollutes namespace — import specific names',
    extensions: ['.py'],
  },
  {
    pattern: /\bprint\s*\(/g,
    category: 'engineering',
    severity: 'low',
    rule: 'python-print',
    message: 'print() in production — use logging module for structured output',
    extensions: ['.py'],
  },
  {
    pattern: /open\s*\([^)]*\)\s*(?!\s*as\b)/g,
    category: 'engineering',
    severity: 'medium',
    rule: 'python-open-no-context',
    message: 'File open without context manager — use `with open(...) as f:` to ensure cleanup',
    extensions: ['.py'],
  },
  {
    pattern: /time\.sleep\s*\(/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'python-time-sleep',
    message: 'time.sleep() blocks the event loop — use asyncio.sleep in async code',
    extensions: ['.py'],
  },
  // --- Benchmark-derived rules (Phase 1: Quality Gate Calibration) ---
  // Source: DevQualityEval, AICGSecEval (CWE-22), AI Code Review CLI
  {
    pattern: /(?:readFile|readFileSync|createReadStream|open)\s*\([^)]*(?:\.\.\/?|req\.\w+|params\.\w+|query\.\w+)/g,
    category: 'security',
    severity: 'critical',
    rule: 'path-traversal',
    message: 'Path traversal risk (CWE-22) — validate and sanitize file paths',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /(?:fetch|axios\.(?:get|post|put|delete)|got|request)\s*\(\s*(?:req\.|params\.|query\.|args\.|user)/g,
    category: 'security',
    severity: 'high',
    rule: 'ssrf-risk',
    message: 'SSRF risk (CWE-918) — validate URLs against an allowlist',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /__proto__|Object\.assign\s*\(\s*\w+\s*,\s*(?:req\.|body\.|params\.|input)/g,
    category: 'security',
    severity: 'critical',
    rule: 'prototype-pollution',
    message: 'Prototype pollution risk — sanitize untrusted objects before merging',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /Math\.random\s*\(\)/g,
    category: 'security',
    severity: 'medium',
    rule: 'insecure-random',
    message: 'Math.random() is not cryptographically secure — use crypto.randomUUID() or crypto.getRandomValues()',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /jwt\.decode\s*\(/g,
    category: 'security',
    severity: 'high',
    rule: 'jwt-no-verify',
    message: 'jwt.decode() does not verify signature — use jwt.verify() instead',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /new\s+Function\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'new-function',
    message: 'new Function() enables code injection — use safe alternatives',
  },
  {
    pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'swallowed-promise',
    message: 'Empty .catch() swallows promise rejections silently',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /(?:res\.(?:json|send|status))\s*\([^)]*(?:err\.stack|error\.stack|\.stack|\.message)/g,
    category: 'security',
    severity: 'high',
    rule: 'error-info-leak',
    message: 'Error details in response leak internals — return generic messages to clients',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /<button\b(?![^>]*(?:aria-label|aria-labelledby))[^>]*>\s*<(?:img|svg|icon)/gi,
    category: 'accessibility',
    severity: 'medium',
    rule: 'button-no-label',
    message: 'Icon-only button without aria-label — add accessible name',
    extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
  },
  {
    pattern: /<input\b(?![^>]*(?:aria-label|aria-labelledby|id\s*=))[^>]*\/?>/gi,
    category: 'accessibility',
    severity: 'medium',
    rule: 'input-no-label',
    message: 'Input without label association — add aria-label or matching <label htmlFor>',
    extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
  },
  {
    pattern: /requests\.(?:get|post|put|delete|patch)\s*\([^)]*verify\s*=\s*False/g,
    category: 'security',
    severity: 'high',
    rule: 'python-requests-no-verify',
    message: 'SSL verification disabled — man-in-the-middle attack risk',
    extensions: ['.py'],
  },
  {
    pattern: /tempfile\.mktemp\s*\(/g,
    category: 'security',
    severity: 'high',
    rule: 'python-tempfile-insecure',
    message: 'tempfile.mktemp() has race condition — use mkstemp() or NamedTemporaryFile',
    extensions: ['.py'],
  },
  {
    pattern: /Runtime\.getRuntime\(\)\.exec\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'java-runtime-exec',
    message: 'Runtime.exec() — command injection risk, use ProcessBuilder with argument list',
    extensions: ['.java'],
  },
  {
    pattern: /GlobalScope\.launch\s*\{/g,
    category: 'scalability',
    severity: 'high',
    rule: 'kotlin-global-scope',
    message: 'GlobalScope.launch leaks coroutines — use structured concurrency (viewModelScope, lifecycleScope)',
    extensions: ['.kt', '.kts'],
  },
  {
    pattern: /math\/rand/g,
    category: 'security',
    severity: 'medium',
    rule: 'go-insecure-rand',
    message: 'math/rand is predictable — use crypto/rand for security-sensitive operations',
    extensions: ['.go'],
  },
  {
    pattern: /render_template_string\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'python-template-injection',
    message: 'render_template_string with user input enables SSTI (CWE-1336) — use render_template with files',
    extensions: ['.py'],
  },
  // --- SecCodeBench CWE calibration rules ---
  {
    pattern: /XMLReaderFactory\.createXMLReader|SAXParserFactory\.newInstance|DocumentBuilderFactory\.newInstance|XMLInputFactory\.newInstance/g,
    category: 'security',
    severity: 'critical',
    rule: 'java-xxe',
    message: 'XML parser without disabling external entities (CWE-611) — set FEATURE_EXTERNAL_GENERAL_ENTITIES to false',
    extensions: ['.java'],
  },
  {
    pattern: /new\s+ObjectInputStream\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'java-deserialization',
    message: 'ObjectInputStream deserialization (CWE-502) — use allowlists or safe formats (JSON, protobuf)',
    extensions: ['.java'],
  },
  {
    pattern: /SpelExpressionParser|ExpressionParser\s*\(\s*\)|\.parseExpression\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'java-spel-injection',
    message: 'Spring Expression Language injection (CWE-917) — avoid evaluating user-controlled expressions',
    extensions: ['.java'],
  },
  {
    pattern: /\.newConfiguration\(\)|FreeMarkerConfigurationFactory|VelocityEngine\s*\(\)|OgnlContext|ActionContext\.getContext/g,
    category: 'security',
    severity: 'critical',
    rule: 'java-ssti',
    message: 'Template engine with user input (CWE-1336) — sandbox templates, never pass raw user input',
    extensions: ['.java'],
  },
  {
    pattern: /(?:redirect|sendRedirect|location\.href|window\.location)\s*(?:=|\()\s*(?:req\.|params\.|query\.|request\.getParameter)/g,
    category: 'security',
    severity: 'high',
    rule: 'open-redirect',
    message: 'Open redirect (CWE-601) — validate redirect URLs against an allowlist',
  },
  {
    pattern: /AES\/ECB\//g,
    category: 'security',
    severity: 'high',
    rule: 'weak-crypto-ecb',
    message: 'AES-ECB mode is insecure (CWE-327) — use AES-GCM or AES-CBC with HMAC',
    extensions: ['.java', '.kt', '.kts'],
  },
  {
    pattern: /ZipEntry|ZipInputStream|TarArchiveEntry/g,
    category: 'security',
    severity: 'high',
    rule: 'zip-slip',
    message: 'Archive extraction without path validation (CWE-22) — check for path traversal in entry names',
    extensions: ['.java', '.kt', '.kts', '.go'],
  },
  {
    pattern: /XPathFactory\.newInstance|XPath\.compile|xpath\.evaluate/g,
    category: 'security',
    severity: 'high',
    rule: 'xpath-injection',
    message: 'XPath query with potential user input (CWE-643) — use parameterized XPath or validate input',
    extensions: ['.java'],
  },
  {
    pattern: /management\.endpoints\.web\.exposure\.include\s*=\s*\*|@EnableActuator/g,
    category: 'security',
    severity: 'high',
    rule: 'java-actuator-exposure',
    message: 'Spring Actuator exposed (CWE-200) — restrict endpoints and require authentication',
    extensions: ['.java', '.properties', '.yml', '.yaml'],
  },
  {
    pattern: /goja\.New\s*\(\)|otto\.New\s*\(\)/g,
    category: 'security',
    severity: 'high',
    rule: 'go-dynamic-code-exec',
    message: 'Dynamic code execution via JS engine (CWE-94) — sandbox execution and validate input',
    extensions: ['.go'],
  },
];

/* walkFiles, CODE_EXTENSIONS, IGNORE_DIRS imported from shared.ts */

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

  const ext = extname(relPath);
  const fnPattern = ext === '.py'
    ? /(?:^|\n)\s*(?:def|async\s+def)\s+\w+/g
    : ext === '.go'
      ? /^func\s+/gm
      : ext === '.rs'
        ? /(?:^|\n)\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+/g
        : ext === '.java'
          ? /(?:public|private|protected|static|\s)+\s+\w+\s+\w+\s*\(/gm
          : ext === '.kt' || ext === '.kts'
            ? /(?:^|\n)\s*(?:(?:private|public|internal|protected|override)\s+)*(?:suspend\s+)?fun\s+/g
            : /(?:function\s+\w+|(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g;
  const fnCount = (content.match(fnPattern) || []).length;
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

  const fileExt = extname(filePath);

  for (const rule of RULES) {
    if (rule.extensions && !rule.extensions.includes(fileExt))
      continue;
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

/* gradeFromScore imported as scoreToGrade from shared.ts */
const gradeFromScore = scoreToGrade;

function buildReport(
  allFindings: Finding[],
  filesScanned: number,
): ScanReport {
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
    filesScanned,
    score,
    grade: gradeFromScore(score),
    summary,
    topFiles,
  };
}

export function scanSpecificFiles(
  dir: string,
  filePaths: string[],
): ScanReport {
  const config = loadConfig(dir);
  const files = filePaths.filter(
    (f) => CODE_EXTENSIONS.has(extname(f)),
  );
  const allFindings: Finding[] = [];

  for (const file of files) {
    const full = join(dir, file);
    allFindings.push(...scanFile(full, dir, config));
  }

  return buildReport(allFindings, files.length);
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

  return buildReport(allFindings, files.length);
}
