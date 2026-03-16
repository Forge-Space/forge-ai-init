import { writeFileSync } from 'node:fs';
import type { ScanReport } from '../scanner.js';
import type { ReportFormat } from './types.js';
import { toMarkdown } from './markdown.js';
import { toSarif } from './sarif.js';

export function formatReport(report: ScanReport, format: ReportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    case 'markdown':
      return toMarkdown(report);
    case 'sarif':
      return toSarif(report);
  }
}

export function writeReport(report: ScanReport, format: ReportFormat, outputPath: string): void {
  const content = formatReport(report, format);
  writeFileSync(outputPath, content, 'utf-8');
}
