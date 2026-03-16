import { baseFiles } from './base.js';
import type { TemplateFile } from './types.js';

export function nextjsTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
            test: 'jest --forceExit',
            'type-check': 'tsc --noEmit',
          },
          dependencies: {
            next: '^15.0.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            '@types/react': '^19.0.0',
            '@types/node': '^22.0.0',
            eslint: '^9.0.0',
            'eslint-config-next': '^15.0.0',
            jest: '^29.0.0',
            '@testing-library/react': '^16.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['dom', 'dom.iterable', 'esnext'],
            strict: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            jsx: 'preserve',
            incremental: true,
            paths: { '@/*': ['./src/*'] },
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
          exclude: ['node_modules'],
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/app/layout.tsx',
      content: `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    },
    {
      path: 'src/app/page.tsx',
      content: `export default function Home() {\n  return <main><h1>${name}</h1></main>;\n}\n`,
    },
  ];
}
