import {
  generateMigrationFiles,
  generateMigrationRoadmap,
} from '../../src/generators/migration.js';
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
});
