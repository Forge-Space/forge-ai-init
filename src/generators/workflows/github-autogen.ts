export function testAutogenLearningWorkflow(): string {
  return `name: Test Autogen Learning

on:
  schedule:
    - cron: '0 12 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  learning:
    name: Weekly Test Autogen Learning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies (if package-lock exists)
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          fi

      - name: Build telemetry summary
        run: |
          mkdir -p .forge
          node <<'NODE'
          const fs = require('node:fs');
          const path = require('node:path');
          const telemetryPath = path.join('.forge', 'test-autogen-telemetry.jsonl');
          const lines = fs.existsSync(telemetryPath)
            ? fs.readFileSync(telemetryPath, 'utf8').trim().split('\\n').filter(Boolean)
            : [];

          let runs = 0;
          let passed = 0;
          let created = 0;
          let missing = 0;

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.event !== 'test-autogen') continue;
              runs += 1;
              if (event.passed === true) passed += 1;
              created += Number(event.created ?? 0);
              missing += Number(event.missing ?? 0);
            } catch {}
          }

          const passRate = runs === 0 ? 'n/a' : String(Math.round((passed / runs) * 100)) + '%';
          const report = [
            '# Test Autogen Weekly Learning',
            '',
            '- Runs: ' + runs,
            '- Pass rate: ' + passRate,
            '- Tests created: ' + created,
            '- Missing required tests: ' + missing,
            '',
            '## Recommended next actions',
            '- Review recurring misses and update path heuristics.',
            '- Tune integration/e2e detection for repeated false positives.',
            '- Keep raw snippets disabled unless explicit opt-in is approved.',
            '',
            'Generated at: ' + new Date().toISOString(),
          ].join('\\n');

          fs.writeFileSync(path.join('.forge', 'test-autogen-learning.md'), report + '\\n');
          NODE

      - name: Snapshot test-autogen status
        run: npx forge-ai-init test-autogen --check --json --tenant "$FORGE_TENANT_ID" --tenant-profile-ref "$FORGE_TENANT_PROFILE_REF" > .forge/test-autogen-latest.json || true

      - name: Open learning PR
        uses: peter-evans/create-pull-request@v7
        with:
          branch: chore/test-autogen-learning
          delete-branch: true
          title: "chore(test-autogen): weekly learning report"
          commit-message: "chore: update weekly test-autogen learning report"
          body: |
            Weekly learning report generated from test-autogen telemetry metadata.
            This PR must be reviewed manually and should not be auto-merged.
          add-paths: |
            .forge/test-autogen-learning.md
            .forge/test-autogen-latest.json
`;
}
