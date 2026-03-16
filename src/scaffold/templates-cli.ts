import { baseFiles } from './base.js';
import type { TemplateFile } from './types.js';

export function cliTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          bin: { [name]: './dist/index.js' },
          files: ['dist'],
          scripts: {
            build: 'tsup src/index.ts --format esm --dts --clean',
            dev: 'tsx src/index.ts',
            lint: 'eslint src/',
            test: 'jest',
            'type-check': 'tsc --noEmit',
          },
          dependencies: {
            '@clack/prompts': '^0.7.0',
            picocolors: '^1.1.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            tsup: '^8.0.0',
            tsx: '^4.0.0',
            jest: '^29.0.0',
            '@types/node': '^22.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/index.ts',
      content: `#!/usr/bin/env node\nimport * as p from '@clack/prompts';\nimport pc from 'picocolors';\n\nasync function main() {\n  p.intro(pc.bold('${name}'));\n  p.outro('Done!');\n}\n\nmain();\n`,
    },
  ];
}
