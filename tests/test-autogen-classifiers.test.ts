import { describe, expect, it } from '@jest/globals';

import { isProductionSource } from '../src/test-autogen/classifiers.js';
import type { DetectedStack } from '../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
  ciProvider: 'github-actions',
};

describe('isProductionSource branch coverage', () => {
  it('returns false for docs markdown files', () => {
    expect(isProductionSource('docs/guide.md', baseStack)).toBe(false);
  });

  it('returns false for non-py files on python stacks', () => {
    const pythonStack: DetectedStack = { ...baseStack, language: 'python' };
    expect(isProductionSource('src/app.ts', pythonStack)).toBe(false);
  });

  it('returns false for unsupported stack languages', () => {
    const goStack: DetectedStack = { ...baseStack, language: 'go' };
    expect(isProductionSource('src/main.go', goStack)).toBe(false);
  });
});
