import { describe, it, expect } from '@jest/globals';
import {
  formatStack,
  gradeColor,
  severityColor,
  statusIcon,
  healthIcon,
  formatScoreDelta,
  formatFindingDelta,
} from '../../src/commands/ui.js';
import type { DetectedStack } from '../../src/types.js';

function makeStack(overrides: Partial<DetectedStack> = {}): DetectedStack {
  return {
    language: 'typescript',
    packageManager: 'npm',
    monorepo: false,
    hasLinting: true,
    hasTypeChecking: true,
    hasFormatting: true,
    hasCi: true,
    ciProvider: 'github-actions',
    buildCommand: 'npm run build',
    testCommand: 'npm test',
    lintCommand: 'npm run lint',
    ...overrides,
  };
}

describe('ui helpers', () => {
  describe('formatStack', () => {
    it('includes language and package manager', () => {
      const result = formatStack(makeStack());
      expect(result).toContain('typescript');
      expect(result).toContain('npm');
    });

    it('includes framework when present', () => {
      const result = formatStack(makeStack({ framework: 'nextjs' }));
      expect(result).toContain('nextjs');
    });

    it('includes buildTool when present', () => {
      const result = formatStack(makeStack({ buildTool: 'tsup' }));
      expect(result).toContain('tsup');
    });

    it('includes testFramework when present', () => {
      const result = formatStack(makeStack({ testFramework: 'jest' }));
      expect(result).toContain('jest');
    });

    it('shows Yes for monorepo', () => {
      const result = formatStack(makeStack({ monorepo: true }));
      expect(result).toContain('Yes');
    });

    it('shows No for monorepo false', () => {
      const result = formatStack(makeStack({ monorepo: false }));
      expect(result).toContain('No');
    });

    it('shows CI provider when hasCi is true', () => {
      const result = formatStack(makeStack({ hasCi: true, ciProvider: 'github-actions' }));
      expect(result).toContain('github-actions');
    });

    it('shows No for hasCi false', () => {
      const result = formatStack(makeStack({ hasCi: false }));
      expect(result).toContain('No');
    });

    it('includes buildCommand when present', () => {
      const result = formatStack(makeStack({ buildCommand: 'npm run build' }));
      expect(result).toContain('npm run build');
    });

    it('includes testCommand when present', () => {
      const result = formatStack(makeStack({ testCommand: 'npm test' }));
      expect(result).toContain('npm test');
    });

    it('includes lintCommand when present', () => {
      const result = formatStack(makeStack({ lintCommand: 'npm run lint' }));
      expect(result).toContain('npm run lint');
    });

    it('omits optional fields when not present', () => {
      const result = formatStack(makeStack({
        framework: undefined,
        buildTool: undefined,
        testFramework: undefined,
        buildCommand: undefined,
        testCommand: undefined,
        lintCommand: undefined,
      }));
      expect(result).toContain('typescript');
      expect(result).not.toContain('Build:');
      expect(result).not.toContain('Tests:');
    });
  });

  describe('gradeColor', () => {
    it('returns colored A', () => {
      const result = gradeColor('A');
      expect(result).toContain('A');
    });

    it('returns colored B', () => {
      const result = gradeColor('B');
      expect(result).toContain('B');
    });

    it('returns colored C', () => {
      const result = gradeColor('C');
      expect(result).toContain('C');
    });

    it('returns colored D', () => {
      const result = gradeColor('D');
      expect(result).toContain('D');
    });

    it('returns colored F (default case)', () => {
      const result = gradeColor('F');
      expect(result).toContain('F');
    });
  });

  describe('severityColor', () => {
    it('colors critical severity', () => {
      const result = severityColor('critical');
      expect(result).toContain('critical');
    });

    it('colors high severity', () => {
      const result = severityColor('high');
      expect(result).toContain('high');
    });

    it('colors medium severity', () => {
      const result = severityColor('medium');
      expect(result).toContain('medium');
    });

    it('colors low severity', () => {
      const result = severityColor('low');
      expect(result).toContain('low');
    });
  });

  describe('statusIcon', () => {
    it('returns pass icon', () => {
      const result = statusIcon('pass');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns fail icon', () => {
      const result = statusIcon('fail');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns warn icon', () => {
      const result = statusIcon('warn');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('pass and fail icons are different', () => {
      expect(statusIcon('pass')).not.toBe(statusIcon('fail'));
    });
  });

  describe('healthIcon', () => {
    it('returns pass icon', () => {
      const result = healthIcon('pass');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns fail icon', () => {
      const result = healthIcon('fail');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns warn icon', () => {
      const result = healthIcon('warn');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatScoreDelta', () => {
    it('shows positive delta with + prefix', () => {
      const result = formatScoreDelta(5);
      expect(result).toContain('+5');
    });

    it('shows negative delta', () => {
      const result = formatScoreDelta(-3);
      expect(result).toContain('-3');
    });

    it('shows zero delta', () => {
      const result = formatScoreDelta(0);
      expect(result).toContain('0');
    });
  });

  describe('formatFindingDelta', () => {
    it('shows positive delta in red (more findings = bad)', () => {
      const result = formatFindingDelta(5);
      expect(result).toContain('+5');
    });

    it('shows negative delta in green (fewer findings = good)', () => {
      const result = formatFindingDelta(-3);
      expect(result).toContain('-3');
    });

    it('shows zero delta', () => {
      const result = formatFindingDelta(0);
      expect(result).toContain('0');
    });
  });
});
