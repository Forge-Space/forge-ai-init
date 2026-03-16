import type { DetectedStack } from '../../types.js';
import { migrationPhases } from './phases.js';
import { detectStrategy, strategyDescription } from './strategy.js';

export function generateMigrationRoadmap(stack: DetectedStack): string {
  const strategy = detectStrategy(stack);
  const phases = migrationPhases();
  const lang = stack.language;
  const fw = stack.framework ?? lang;

  let content = `# Migration Roadmap

## Strategy: ${strategy.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}

${strategyDescription(strategy)}

## Detected Stack

- Language: ${lang}
- Framework: ${fw}
- Package Manager: ${stack.packageManager}
- Has Tests: ${stack.testFramework ? `Yes (${stack.testFramework})` : 'No'}
- Has Linting: ${stack.hasLinting ? 'Yes' : 'No'}
- Has Type Checking: ${stack.hasTypeChecking ? 'Yes' : 'No'}
- Has CI: ${stack.hasCi ? 'Yes' : 'No'}

## Phases

`;

  for (const phase of phases) {
    content += `### ${phase.name}\n\n`;
    if (phase.threshold > 0) {
      content += `**Quality Gate:** ${phase.threshold}% minimum score\n`;
      content += `**Focus:** ${phase.focus.join(', ')}\n\n`;
    }
    content += `**Tasks:**\n`;
    for (const task of phase.tasks) {
      content += `- [ ] ${task}\n`;
    }
    content += '\n';
  }

  content += `## Key Commands

\`\`\`bash
# Assess current state
npx forge-ai-init check
npx forge-ai-init migrate

# Add governance layer
npx forge-ai-init --migrate --tier standard --yes

# Run quality gate check
npx forge-ai-init check
\`\`\`

## ADR Template

Create \`docs/adr/ADR-NNNN-title.md\` for each migration decision:

\`\`\`markdown
# ADR-NNNN: [Decision Title]

## Status: [Proposed | Accepted | Deprecated]

## Context
[Why this decision is needed]

## Decision
[What was decided]

## Consequences
[What changes as a result]
\`\`\`
`;

  return content;
}
