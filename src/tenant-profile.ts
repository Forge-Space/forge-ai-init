import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type {
  TenantCiPolicy,
  TenantContext,
  TenantProfile,
  TenantQualityPolicy,
} from './types.js';

type CliOptions = Record<string, string | boolean>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseScalar(value: string): unknown {
  const normalized = value.trim();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function stripInlineComment(line: string): string {
  const marker = line.indexOf(' #');
  if (marker < 0) return line;
  return line.slice(0, marker);
}

function isSimpleYamlKey(key: string): boolean {
  if (!key) return false;
  for (const char of key) {
    const code = char.charCodeAt(0);
    const isAlphaNum =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    if (!isAlphaNum && char !== '_' && char !== '.' && char !== '-') return false;
  }
  return true;
}

function parseSimpleYamlLine(rawLine: string): {
  indent: number;
  key: string;
  value: string;
} | null {
  const line = stripInlineComment(rawLine);
  const trimmed = line.trimStart();
  if (!trimmed) return null;

  const indent = line.length - trimmed.length;
  const separator = trimmed.indexOf(':');
  if (separator <= 0) return null;

  const key = trimmed.slice(0, separator).trim();
  if (!isSimpleYamlKey(key)) return null;

  const value = trimmed.slice(separator + 1).trim();
  return { indent, key, value };
}

function parseSimpleYaml(content: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; node: Record<string, unknown> }> = [
    { indent: -1, node: root },
  ];

  for (const rawLine of content.split('\n')) {
    const parsedLine = parseSimpleYamlLine(rawLine);
    if (!parsedLine) continue;
    const { indent, key, value } = parsedLine;

    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!.node;
    if (value.length === 0) {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, node: child });
      continue;
    }

    parent[key] = parseScalar(value);
  }

  return root;
}

function parseProfileText(profilePath: string, content: string): unknown {
  const ext = extname(profilePath).toLowerCase();
  if (ext === '.json') return JSON.parse(content);
  if (ext === '.yml' || ext === '.yaml') return parseSimpleYaml(content);
  throw new Error(`Unsupported tenant profile format: ${ext}`);
}

function isQualityPolicy(value: unknown): value is TenantQualityPolicy {
  if (!isRecord(value)) return false;
  return (
    typeof value['min_quality_score'] === 'number' &&
    typeof value['block_on_critical'] === 'boolean' &&
    typeof value['block_on_high'] === 'boolean'
  );
}

function isCiPolicy(value: unknown): value is TenantCiPolicy {
  if (!isRecord(value)) return false;
  return (
    typeof value['require_sonar'] === 'boolean' &&
    typeof value['require_security_scan'] === 'boolean' &&
    typeof value['enforce_pr_checks'] === 'boolean'
  );
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertTenantProfile(value: unknown): asserts value is TenantProfile {
  if (!isRecord(value)) throw new Error('Tenant profile must be an object.');

  const valid =
    isText(value['tenant_id']) &&
    isText(value['github_owner']) &&
    isText(value['sonar_org']) &&
    isText(value['npm_scope']) &&
    isQualityPolicy(value['quality_policy']) &&
    isCiPolicy(value['ci_policy']);

  if (!valid) {
    throw new Error(
      [
        'Invalid tenant profile: required keys are',
        'tenant_id, github_owner, sonar_org, npm_scope, quality_policy, ci_policy.',
      ].join(' '),
    );
  }
}

function resolveProfilePath(projectDir: string, profileRef: string): string {
  if (profileRef.startsWith('file://')) {
    return new URL(profileRef).pathname;
  }

  const candidates = [resolve(projectDir, profileRef), resolve(profileRef)];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if (!statSync(candidate).isFile()) continue;
    return candidate;
  }

  throw new Error(
    `Tenant profile not found: ${profileRef}. Provide a readable file path for --tenant-profile-ref.`,
  );
}

function requiredTenantId(opts: CliOptions): string {
  const value = (opts['tenant'] as string | undefined) ?? process.env.FORGE_TENANT_ID;
  const tenant = value?.trim();
  if (tenant) return tenant;
  throw new Error('Missing tenant context: provide --tenant or FORGE_TENANT_ID.');
}

function requiredProfileRef(opts: CliOptions): string {
  const optionRef =
    (opts['tenant-profile-ref'] as string | undefined) ??
    (opts['tenant-profile'] as string | undefined);
  const envRef = process.env.FORGE_TENANT_PROFILE_REF;
  const profileRef = (optionRef ?? envRef)?.trim();
  if (profileRef) return profileRef;
  throw new Error(
    'Missing tenant profile reference: provide --tenant-profile-ref or FORGE_TENANT_PROFILE_REF.',
  );
}

export function resolveTenantContext(
  projectDir: string,
  opts: CliOptions,
): TenantContext {
  const tenantId = requiredTenantId(opts);
  const profileRef = requiredProfileRef(opts);
  const profilePath = resolveProfilePath(projectDir, profileRef);
  const content = readFileSync(profilePath, 'utf-8');
  const parsed = parseProfileText(profilePath, content);
  assertTenantProfile(parsed);

  if (parsed.tenant_id !== tenantId) {
    throw new Error(
      `Tenant mismatch: --tenant=${tenantId} but profile tenant_id=${parsed.tenant_id}.`,
    );
  }

  return {
    tenantId,
    profileRef,
    profilePath,
    profile: parsed,
  };
}
