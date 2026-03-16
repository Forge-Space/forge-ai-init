import type { ScanReport } from '../scanner.js';
import { sarifLevel, getVersion } from './helpers.js';

export function toSarif(report: ScanReport): string {
  const sarif = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'forge-ai-init',
            version: getVersion(),
            rules: report.summary.map(cat => ({
              id: cat.category,
              shortDescription: {
                text: `${cat.category} findings`,
              },
            })),
          },
        },
        results: report.findings.map(f => ({
          ruleId: f.rule,
          level: sarifLevel(f.severity),
          message: { text: f.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.file },
                region: {
                  startLine: f.line,
                },
              },
            },
          ],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
