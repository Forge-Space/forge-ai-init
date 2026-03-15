import { mkdirSync, writeFileSync } from 'node:fs';
import pc from 'picocolors';
import { generateCiPipeline, type CiOptions } from '../ci-command.js';

const VALID_PROVIDERS = ['github-actions', 'gitlab-ci', 'bitbucket'] as const;

export function runCiCommand(
  projectDir: string,
  provider?: string,
  phase?: string,
  threshold?: number,
  includeBaseline?: boolean,
  asJson?: boolean,
): void {
  if (!provider) {
    console.log('');
    console.log(`  ${pc.bold(pc.magenta('forge-ai-init ci'))} — CI Pipeline Generator`);
    console.log('');
    console.log(`  ${pc.bold('Supported providers:')}`);
    for (const p of VALID_PROVIDERS) console.log(`    ${pc.cyan(p)}`);
    console.log('');
    console.log(`  ${pc.dim('Usage:')} forge-ai-init ci --provider <name>`);
    console.log('');
    return;
  }

  if (!VALID_PROVIDERS.includes(provider as CiOptions['provider'])) {
    console.error(pc.red(`  Unknown provider: ${provider}. Valid: ${VALID_PROVIDERS.join(', ')}`));
    process.exit(1);
  }

  const result = generateCiPipeline(projectDir, {
    provider: provider as CiOptions['provider'],
    phase: phase as CiOptions['phase'],
    threshold,
    includeBaseline,
  });

  if (asJson) { console.log(JSON.stringify(result, null, 2)); return; }

  const fullPath = `${projectDir}/${result.filePath}`;
  const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  mkdirSync(parentDir, { recursive: true });
  writeFileSync(fullPath, result.content + '\n', 'utf-8');

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init ci'))} — Pipeline Generated`);
  console.log('');
  console.log(`  ${pc.green('✓')} Created ${pc.cyan(result.filePath)}`);
  console.log(`  ${pc.dim('Provider:')} ${result.provider}`);
  console.log('');
  console.log(`  ${pc.bold('Commands in pipeline:')}`);
  for (const cmd of result.commands) console.log(`    ${pc.dim('$')} ${cmd}`);
  console.log('');
}
