import pc from 'picocolors';
import { scaffold, TEMPLATE_LIST, type TemplateId } from '../scaffold.js';

export function runScaffoldCommand(
  dir: string,
  template?: string,
  name?: string,
  asJson?: boolean,
): void {
  if (!template) {
    console.log('');
    console.log(`  ${pc.bold(pc.magenta('forge-ai-init scaffold'))} — Golden Path Templates`);
    console.log('');
    console.log(`  ${pc.bold('Available templates:')}`);
    for (const t of TEMPLATE_LIST) {
      console.log(`    ${pc.cyan(t.id.padEnd(20))} ${pc.dim(t.description)}`);
    }
    console.log('');
    console.log(`  ${pc.dim('Usage:')} forge-ai-init scaffold --template <id> --name <project-name>`);
    console.log('');
    return;
  }

  if (!name) {
    console.error(pc.red('  Missing --name flag. Usage: forge-ai-init scaffold --template <id> --name <name>'));
    process.exit(1);
  }

  const validIds = TEMPLATE_LIST.map((t) => t.id);
  if (!validIds.includes(template as TemplateId)) {
    console.error(pc.red(`  Unknown template: ${template}. Valid: ${validIds.join(', ')}`));
    process.exit(1);
  }

  const result = scaffold({ template: template as TemplateId, name, dir });

  if (asJson) { console.log(JSON.stringify(result, null, 2)); return; }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init scaffold'))} — Project Created`);
  console.log('');
  console.log(`  ${pc.dim('Template:')} ${pc.cyan(result.template)}`);
  console.log(`  ${pc.dim('Location:')} ${result.projectDir}`);
  console.log('');
  console.log(`  ${pc.bold('Created files:')}`);
  for (const f of result.created) console.log(`    ${pc.green('+')} ${f}`);
  console.log('');
  console.log(`  ${pc.dim('Next:')} cd ${name} && npm install`);
  console.log('');
}
