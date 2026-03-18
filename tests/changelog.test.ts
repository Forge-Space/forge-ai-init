import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CHANGELOG', () => {
  it('does not contain duplicate version headings', () => {
    const changelogPath = join(import.meta.dirname, '..', 'CHANGELOG.md');
    const content = readFileSync(changelogPath, 'utf8');
    const lines = content.split('\n');

    const versions: string[] = [];
    for (const line of lines) {
      const match = line.match(/^## \[(.+?)\] - /);
      if (!match) continue;
      versions.push(match[1]);
    }

    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const version of versions) {
      if (seen.has(version)) {
        duplicates.add(version);
      }
      seen.add(version);
    }

    expect(Array.from(duplicates)).toEqual([]);
  });
});
