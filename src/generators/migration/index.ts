import type { DetectedStack, Tier } from '../../types.js';
import { generateInitialAdr } from './adr.js';
import { generateMigrationRoadmap } from './roadmap.js';
import type { MigrationFile } from './types.js';

export type { MigrationFile, MigrationStrategy } from './types.js';
export { generateMigrationRoadmap } from './roadmap.js';

export function generateMigrationFiles(
  stack: DetectedStack,
  _tier: Tier,
): MigrationFile[] {
  return [
    {
      path: 'MIGRATION.md',
      content: generateMigrationRoadmap(stack),
    },
    {
      path: 'docs/adr/ADR-0001-migration-strategy.md',
      content: generateInitialAdr(stack),
    },
  ];
}
