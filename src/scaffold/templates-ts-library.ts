import { baseFiles } from './base.js';
import type { TemplateFile } from './types.js';

export function tsLibraryTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          main: './dist/index.js',
          types: './dist/index.d.ts',
          files: ['dist'],
          scripts: {
            build: 'tsup src/index.ts --format esm --dts --clean',
            dev: 'tsup src/index.ts --format esm --dts --watch',
            lint: 'eslint src/',
            test: 'jest',
            'type-check': 'tsc --noEmit',
            prepublishOnly: 'npm run build',
          },
          devDependencies: {
            typescript: '^5.7.0',
            tsup: '^8.0.0',
            jest: '^29.0.0',
            eslint: '^9.0.0',
            '@types/node': '^22.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/index.ts',
      content: `export function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n`,
    },
    {
      path: 'tests/index.test.ts',
      content: `import { greet } from '../src/index';\n\ntest('greet returns greeting', () => {\n  expect(greet('World')).toBe('Hello, World!');\n});\n`,
    },
  ];
}
