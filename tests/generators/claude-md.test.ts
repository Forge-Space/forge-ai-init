import {
  generateClaudeMd,
  generateCursorRules,
  generateCopilotInstructions,
} from '../../src/generators/claude-md.js';
import type { DetectedStack } from '../../src/types.js';

function makeStack(
  overrides: Partial<DetectedStack> = {},
): DetectedStack {
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
    testCommand: 'npm run test',
    lintCommand: 'npm run lint',
    ...overrides,
  };
}

describe('generateClaudeMd', () => {
  it('includes common rules for any stack', () => {
    const md = generateClaudeMd(makeStack(), 'standard');
    expect(md).toContain('## Architecture');
    expect(md).toContain('## Security');
    expect(md).toContain('## Testing');
    expect(md).toContain('## Workflow');
  });

  it('includes TypeScript rules for TS projects', () => {
    const md = generateClaudeMd(makeStack(), 'standard');
    expect(md).toContain('## TypeScript');
    expect(md).toContain('no `any` types');
  });

  it('includes Next.js rules when nextjs detected', () => {
    const md = generateClaudeMd(
      makeStack({ framework: 'nextjs' }),
      'standard',
    );
    expect(md).toContain('## Next.js');
    expect(md).toContain('Server Components');
    expect(md).toContain('## React');
  });

  it('includes React rules without Next.js rules', () => {
    const md = generateClaudeMd(
      makeStack({ framework: 'react' }),
      'standard',
    );
    expect(md).toContain('## React');
    expect(md).not.toContain('## Next.js');
  });

  it('includes Vue rules for Vue projects', () => {
    const md = generateClaudeMd(
      makeStack({ framework: 'vue' }),
      'standard',
    );
    expect(md).toContain('## Vue');
    expect(md).toContain('Composition API');
  });

  it('includes Python rules for Python projects', () => {
    const md = generateClaudeMd(
      makeStack({ language: 'python', framework: 'fastapi' }),
      'standard',
    );
    expect(md).toContain('## Python');
    expect(md).toContain('Type hints');
  });

  it('includes Express rules for Express projects', () => {
    const md = generateClaudeMd(
      makeStack({ framework: 'express' }),
      'standard',
    );
    expect(md).toContain('## Express');
    expect(md).toContain('## Node.js');
  });

  it('includes Quick Reference with commands', () => {
    const md = generateClaudeMd(makeStack(), 'standard');
    expect(md).toContain('## Quick Reference');
    expect(md).toContain('npm run build');
    expect(md).toContain('npm run test');
  });

  it('includes stack label in header', () => {
    const md = generateClaudeMd(
      makeStack({ framework: 'nextjs' }),
      'standard',
    );
    expect(md).toContain('nextjs + typescript');
  });

  it('adds compliance section for enterprise tier', () => {
    const md = generateClaudeMd(makeStack(), 'enterprise');
    expect(md).toContain('## Compliance');
    expect(md).toContain('Architecture Decision Records');
  });

  it('excludes compliance for standard tier', () => {
    const md = generateClaudeMd(makeStack(), 'standard');
    expect(md).not.toContain('## Compliance');
  });

  it('includes forge-ai-init attribution', () => {
    const md = generateClaudeMd(makeStack(), 'standard');
    expect(md).toContain('forge-ai-init');
  });
});

describe('generateCursorRules', () => {
  it('includes rules without Quick Reference header', () => {
    const rules = generateCursorRules(makeStack(), 'standard');
    expect(rules).toContain('## Architecture');
    expect(rules).not.toContain('## Quick Reference');
    expect(rules).not.toContain('# Project Rules');
  });
});

describe('generateCopilotInstructions', () => {
  it('has Copilot Instructions header', () => {
    const md = generateCopilotInstructions(
      makeStack(),
      'standard',
    );
    expect(md).toContain('# Copilot Instructions');
  });
});
