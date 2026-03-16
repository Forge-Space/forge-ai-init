import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { DetectedStack } from '../types.js';
import type { AssessmentFinding } from './types.js';

export function collectQualityFindings(
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
    const testRatio = sourceFiles > 0 ? testFileCount / sourceFiles : 0;

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
      content.match(/(?:TODO|FIXME|HACK|XXX)(?:\s*:|\s)/g) ?? []
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
