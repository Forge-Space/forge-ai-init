import { readFileSync } from 'node:fs';
import { relative, extname } from 'node:path';
import {
  isRuleDisabled,
  getRuleSeverity,
  isCategoryEnabled,
  isFileIgnored,
  type ForgeConfig,
} from '../config.js';
import { RULES } from '../rules/index.js';
import type { Finding } from './types.js';
import { checkFileSize } from './file-checker.js';

export function scanFile(filePath: string, base: string, config: ForgeConfig): Finding[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const relPath = relative(base, filePath);

  if (isFileIgnored(config, relPath)) return [];

  const lines = content.split('\n');
  const findings: Finding[] = [];

  findings.push(...checkFileSize(relPath, lines));

  const fileExt = extname(filePath);

  for (const rule of RULES) {
    if (rule.extensions && !rule.extensions.includes(fileExt)) continue;
    if (isRuleDisabled(config, rule.rule)) continue;
    if (!isCategoryEnabled(config, rule.category)) continue;

    const severity = getRuleSeverity(config, rule.rule, rule.severity);

    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      findings.push({
        file: relPath,
        line,
        category: rule.category,
        severity,
        rule: rule.rule,
        message: rule.message,
      });
    }
  }

  return findings;
}
