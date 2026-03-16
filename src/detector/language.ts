import type { Language } from '../types.js';
import { fileExists, findFileRecursive, hasKotlinSources } from './utils.js';

export function detectLanguage(dir: string): Language {
  if (fileExists(dir, 'tsconfig.json', 'tsconfig.base.json'))
    return 'typescript';
  if (findFileRecursive(dir, 'tsconfig.json', 2)) return 'typescript';
  if (fileExists(dir, 'Cargo.toml')) return 'rust';
  if (fileExists(dir, 'go.mod')) return 'go';
  if (fileExists(dir, 'build.gradle.kts') && hasKotlinSources(dir))
    return 'kotlin';
  if (fileExists(dir, 'pom.xml', 'build.gradle', 'build.gradle.kts'))
    return 'java';
  if (
    fileExists(
      dir,
      'pyproject.toml',
      'setup.py',
      'setup.cfg',
      'requirements.txt',
    )
  )
    return 'python';
  if (fileExists(dir, 'package.json')) return 'javascript';
  return 'javascript';
}
