import {
  generateMigrationFiles,
  generateMigrationRoadmap,
} from '../../src/generators/migration.js';
import {
  detectStrategy,
  strategyDescription,
  strategyRationale,
} from '../../src/generators/migration/strategy.js';
import type { DetectedStack } from '../../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: false,
  hasTypeChecking: false,
  hasFormatting: false,
  hasCi: false,
};

describe('generateMigrationRoadmap', () => {
  it('includes strategy for Express projects', () => {
    const stack: DetectedStack = {
      ...baseStack,
      framework: 'express',
    };
    const content = generateMigrationRoadmap(stack);
    expect(content).toContain('Strangler Fig');
    expect(content).toContain('express');
  });

  it('uses branch-by-abstraction for React', () => {
    const stack: DetectedStack = {
      ...baseStack,
      framework: 'react',
    };
    const content = generateMigrationRoadmap(stack);
    expect(content).toContain('Branch By Abstraction');
  });

  it('uses parallel-run for Java', () => {
    const stack: DetectedStack = {
      ...baseStack,
      language: 'java',
      packageManager: 'npm',
    };
    const content = generateMigrationRoadmap(stack);
    expect(content).toContain('Parallel Run');
  });

  it('includes 4 migration phases', () => {
    const content = generateMigrationRoadmap(baseStack);
    expect(content).toContain('Assessment');
    expect(content).toContain('Foundation (40% quality gate)');
    expect(content).toContain('Stabilization (60% quality gate)');
    expect(content).toContain('Production (80% quality gate)');
  });

  it('includes detected stack info', () => {
    const stack: DetectedStack = {
      ...baseStack,
      testFramework: 'jest',
      hasLinting: true,
    };
    const content = generateMigrationRoadmap(stack);
    expect(content).toContain('Has Tests: Yes (jest)');
    expect(content).toContain('Has Linting: Yes');
  });

  it('includes actionable commands', () => {
    const content = generateMigrationRoadmap(baseStack);
    expect(content).toContain('npx forge-ai-init check');
    expect(content).toContain('npx forge-ai-init migrate');
  });

  it('includes ADR template', () => {
    const content = generateMigrationRoadmap(baseStack);
    expect(content).toContain('ADR Template');
    expect(content).toContain('## Status');
    expect(content).toContain('## Context');
  });
});

describe('generateMigrationFiles', () => {
  it('generates MIGRATION.md and initial ADR', () => {
    const files = generateMigrationFiles(baseStack, 'standard');
    const paths = files.map((f) => f.path);

    expect(paths).toContain('MIGRATION.md');
    expect(paths).toContain(
      'docs/adr/ADR-0001-migration-strategy.md',
    );
  });

  it('ADR includes strategy rationale', () => {
    const stack: DetectedStack = {
      ...baseStack,
      framework: 'express',
    };
    const files = generateMigrationFiles(stack, 'standard');
    const adr = files.find((f) => f.path.includes('ADR-0001'));

    expect(adr).toBeDefined();
    expect(adr!.content).toContain('strangler fig');
    expect(adr!.content).toContain('express');
  });

  it('ADR includes progressive quality gates', () => {
    const files = generateMigrationFiles(baseStack, 'enterprise');
    const adr = files.find((f) => f.path.includes('ADR-0001'));

    expect(adr!.content).toContain('40%');
    expect(adr!.content).toContain('60%');
    expect(adr!.content).toContain('80%');
  });

  it('ADR reflects hasCi configured when CI is present', () => {
    const stack: DetectedStack = { ...baseStack, hasCi: true };
    const files = generateMigrationFiles(stack, 'standard');
    const adr = files.find((f) => f.path.includes('ADR-0001'));

    expect(adr!.content).toContain('CI/CD: configured');
  });

  it('MIGRATION.md reflects hasCi yes when CI is present', () => {
    const stack: DetectedStack = { ...baseStack, hasCi: true };
    const content = generateMigrationRoadmap(stack);

    expect(content).toContain('Has CI: Yes');
  });
});

describe('detectStrategy', () => {
  it('returns strangler-fig for fastapi', () => {
    expect(detectStrategy({ ...baseStack, framework: 'fastapi' })).toBe('strangler-fig');
  });

  it('returns strangler-fig for django', () => {
    expect(detectStrategy({ ...baseStack, framework: 'django' })).toBe('strangler-fig');
  });

  it('returns strangler-fig for flask', () => {
    expect(detectStrategy({ ...baseStack, framework: 'flask' })).toBe('strangler-fig');
  });

  it('returns branch-by-abstraction for vue', () => {
    expect(detectStrategy({ ...baseStack, framework: 'vue' })).toBe('branch-by-abstraction');
  });

  it('returns branch-by-abstraction for nextjs', () => {
    expect(detectStrategy({ ...baseStack, framework: 'nextjs' })).toBe('branch-by-abstraction');
  });

  it('returns strangler-fig as default for unknown framework', () => {
    expect(detectStrategy({ ...baseStack })).toBe('strangler-fig');
  });
});

describe('strategyDescription', () => {
  it('returns description for lift-and-shift', () => {
    const desc = strategyDescription('lift-and-shift');
    expect(desc).toContain('Move to new infrastructure first');
  });
});

describe('strategyRationale', () => {
  it('returns rationale for branch-by-abstraction with framework', () => {
    const stack: DetectedStack = { ...baseStack, framework: 'react' };
    const rationale = strategyRationale('branch-by-abstraction', stack);
    expect(rationale).toContain('react');
    expect(rationale).toContain('abstraction');
  });

  it('returns rationale for branch-by-abstraction falls back to language when no framework', () => {
    const rationale = strategyRationale('branch-by-abstraction', baseStack);
    expect(rationale).toContain('typescript');
  });

  it('returns rationale for parallel-run', () => {
    const stack: DetectedStack = { ...baseStack, language: 'java' };
    const rationale = strategyRationale('parallel-run', stack);
    expect(rationale).toContain('java');
    expect(rationale).toContain('simultaneously');
  });

  it('returns rationale for lift-and-shift', () => {
    const rationale = strategyRationale('lift-and-shift', baseStack);
    expect(rationale).toContain('typescript');
    expect(rationale).toContain('infrastructure');
  });

  it('returns rationale for strangler-fig falls back to language when no framework', () => {
    const rationale = strategyRationale('strangler-fig', baseStack);
    expect(rationale).toContain('typescript');
  });
});
