import { extname } from 'node:path';
import type { Finding } from './types.js';

function getFunctionPattern(ext: string): RegExp {
  if (ext === '.py') return /(?:^|\n)\s*(?:def|async\s+def)\s+\w+/g;
  if (ext === '.go') return /^func\s+/gm;
  if (ext === '.rs') return /(?:^|\n)\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+/g;
  if (ext === '.java') return /(?:public|private|protected|static|\s)+\s+\w+\s+\w+\s*\(/gm;
  if (ext === '.kt' || ext === '.kts') {
    return /(?:^|\n)\s*(?:(?:private|public|internal|protected|override)\s+)*(?:suspend\s+)?fun\s+/g;
  }
  return /(?:function\s+\w+|(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g;
}

export function checkFileSize(relPath: string, lines: string[]): Finding[] {
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
  const fnPattern = getFunctionPattern(ext);
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
