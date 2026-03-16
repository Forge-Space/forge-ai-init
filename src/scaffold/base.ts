import type { TemplateFile } from './types.js';

export function baseFiles(name: string): TemplateFile[] {
  return [
    {
      path: '.gitignore',
      content: 'node_modules/\ndist/\n.env\n.env.local\ncoverage/\n.next/\n.turbo/\n',
    },
    {
      path: 'CLAUDE.md',
      content: `# ${name}\n\n## Quick Reference\n\n\`\`\`bash\nnpm run dev      # Start development\nnpm run build    # Production build\nnpm run test     # Run tests\nnpm run lint     # Lint code\n\`\`\`\n\n## Conventions\n\n- Functions <50 lines, complexity <10\n- Conventional commits\n- >80% test coverage target\n- Security-first: validate inputs, sanitize outputs\n`,
    },
    {
      path: '.forgerc.json',
      content: JSON.stringify(
        {
          preset: 'recommended',
          thresholds: { error: 60, warn: 40 },
          ignore: ['dist/**', 'coverage/**', 'node_modules/**'],
        },
        null,
        2,
      ) + '\n',
    },
  ];
}
