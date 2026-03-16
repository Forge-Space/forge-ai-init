import { baseFiles } from './base.js';
import type { TemplateFile } from './types.js';

export function expressTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsup src/index.ts --format esm --dts',
            start: 'node dist/index.js',
            lint: 'eslint src/',
            test: 'jest --forceExit',
            'type-check': 'tsc --noEmit',
          },
          dependencies: {
            express: '^5.0.0',
            zod: '^3.23.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            '@types/express': '^5.0.0',
            '@types/node': '^22.0.0',
            tsx: '^4.0.0',
            tsup: '^8.0.0',
            jest: '^29.0.0',
            eslint: '^9.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/index.ts',
      content: `import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/health', (_req, res) => {\n  res.json({ status: 'ok' });\n});\n\nconst port = process.env.PORT ?? 3000;\napp.listen(port, () => {\n  console.log(\`Server running on port \${port}\`);\n});\n`,
    },
  ];
}
