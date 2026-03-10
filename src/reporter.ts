import { writeFileSync } from 'node:fs';
import type { ScanReport } from './scanner.js';

export type ReportFormat = 'json' | 'markdown' | 'sarif';

function gradeIcon(grade: string): string {
  switch (grade) {
    case 'A': return '🟢';
    case 'B': return '🔵';
    case 'C': return '🟡';
    case 'D': return '🟠';
    default: return '🔴';
  }
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    default: return '🔵';
  }
}

function categoryLabel(cat: string): string {
  return cat.split('-').map(
    w => w.charAt(0).toUpperCase() + w.slice(1),
  ).join(' ');
}

function toMarkdown(report: ScanReport): string {
  const lines: string[] = [];
  const icon = gradeIcon(report.grade);
  const total = report.findings.length;
  const critical = report.findings.filter(
    f => f.severity === 'critical',
  );
  const high = report.findings.filter(
    f => f.severity === 'high',
  );
  const medium = report.findings.filter(
    f => f.severity === 'medium',
  );
  const low = report.findings.filter(
    f => f.severity === 'low',
  );

  lines.push(
    `${icon} **Grade ${report.grade}** · Score **${report.score}**/100 · ${report.filesScanned} files scanned`,
  );
  lines.push('');

  if (total === 0) {
    lines.push(
      '### ✅ Strengths',
    );
    lines.push('');
    lines.push(
      '- No anti-patterns detected across all scanned files',
    );
    lines.push('- Codebase follows governance best practices');
    lines.push('');
  } else {
    const cleanCats = report.summary.filter(
      c => c.count === 0,
    );
    if (cleanCats.length > 0) {
      lines.push('### ✅ Strengths');
      lines.push('');
      for (const c of cleanCats) {
        lines.push(
          `- **${categoryLabel(c.category)}** — No issues found`,
        );
      }
      lines.push('');
    }
  }

  if (critical.length > 0 || high.length > 0) {
    lines.push('### 🚨 Critical Issues');
    lines.push('');
    const urgent = [...critical, ...high].slice(0, 15);
    lines.push('| Severity | Rule | File | Issue |');
    lines.push('|:--------:|------|------|-------|');
    for (const f of urgent) {
      const sev = severityIcon(f.severity);
      const loc = `\`${f.file}:${f.line}\``;
      lines.push(
        `| ${sev} ${f.severity} | \`${f.rule}\` | ${loc} | ${f.message} |`,
      );
    }
    if (critical.length + high.length > 15) {
      lines.push('');
      lines.push(
        `> …and ${critical.length + high.length - 15} more critical/high findings`,
      );
    }
    lines.push('');
  }

  if (medium.length > 0 || low.length > 0) {
    lines.push('<details>');
    lines.push(
      `<summary><strong>⚠️ Improvements (${medium.length + low.length})</strong></summary>`,
    );
    lines.push('');
    const improvements = [...medium, ...low].slice(0, 20);
    lines.push('| Severity | Rule | File | Issue |');
    lines.push('|:--------:|------|------|-------|');
    for (const f of improvements) {
      const sev = severityIcon(f.severity);
      const loc = `\`${f.file}:${f.line}\``;
      lines.push(
        `| ${sev} ${f.severity} | \`${f.rule}\` | ${loc} | ${f.message} |`,
      );
    }
    if (medium.length + low.length > 20) {
      lines.push('');
      lines.push(
        `> …and ${medium.length + low.length - 20} more`,
      );
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  if (report.summary.length > 0) {
    const cats = report.summary.filter(c => c.count > 0);
    if (cats.length > 0) {
      lines.push('<details>');
      lines.push(
        '<summary><strong>📊 Category Breakdown</strong></summary>',
      );
      lines.push('');
      lines.push(
        '| Category | Findings | Critical | High | Health |',
      );
      lines.push(
        '|----------|:--------:|:--------:|:----:|:------:|',
      );
      for (const cat of report.summary) {
        const health = cat.critical > 0 ? '🔴'
          : cat.high > 0 ? '🟠'
          : cat.count > 0 ? '🟡' : '🟢';
        lines.push(
          `| ${categoryLabel(cat.category)} | ${cat.count} | ${cat.critical} | ${cat.high} | ${health} |`,
        );
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  if (report.topFiles.length > 0) {
    lines.push('<details>');
    lines.push(
      `<summary><strong>📁 Hot Files (${report.topFiles.length})</strong></summary>`,
    );
    lines.push('');
    lines.push('| File | Findings | Worst Severity |');
    lines.push('|------|:--------:|:--------------:|');
    for (const f of report.topFiles.slice(0, 10)) {
      const sev = severityIcon(f.worst);
      lines.push(
        `| \`${f.file}\` | ${f.count} | ${sev} ${f.worst} |`,
      );
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  if (total > 0) {
    lines.push('### 💡 Recommendations');
    lines.push('');
    if (critical.length > 0) {
      lines.push(
        `- **Fix ${critical.length} critical issue${critical.length === 1 ? '' : 's'} immediately** — these represent security vulnerabilities or dangerous patterns`,
      );
    }
    if (high.length > 0) {
      lines.push(
        `- **Address ${high.length} high-priority finding${high.length === 1 ? '' : 's'}** — technical debt that compounds over time`,
      );
    }
    if (medium.length + low.length > 0) {
      lines.push(
        `- **${medium.length + low.length} improvement${medium.length + low.length === 1 ? '' : 's'}** to consider for code quality`,
      );
    }
    lines.push(
      '- Run `npx forge-ai-init` to add governance rules and CI quality gates',
    );
    lines.push('');
  }

  lines.push(
    `<sub>Generated by forge-ai-init v${getVersion()} · ${report.filesScanned} files · ${total} findings</sub>`,
  );
  lines.push('');

  return lines.join('\n');
}

function toSarif(report: ScanReport): string {
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

function sarifLevel(
  severity: string,
): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    default:
      return 'note';
  }
}

function getVersion(): string {
  return '0.25.0';
}


export function formatReport(
  report: ScanReport,
  format: ReportFormat,
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    case 'markdown':
      return toMarkdown(report);
    case 'sarif':
      return toSarif(report);
  }
}

export function writeReport(
  report: ScanReport,
  format: ReportFormat,
  outputPath: string,
): void {
  const content = formatReport(report, format);
  writeFileSync(outputPath, content, 'utf-8');
}
