import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTenantContext } from '../src/tenant-profile.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-tenant-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const YAML_PROFILE = `
tenant_id: acme-sandbox
github_owner: acme-org
sonar_org: acme-org
npm_scope: "@acme"
quality_policy:
  min_quality_score: 80
  block_on_critical: true
  block_on_high: true
ci_policy:
  require_sonar: true
  require_security_scan: true
  enforce_pr_checks: true
`.trimStart();

const ENTERPRISE_PROFILE = `
tenant_id: acme-enterprise
github_owner: acme-enterprise
sonar_org: acme-enterprise
npm_scope: "@acme-enterprise"
quality_policy:
  min_quality_score: 80
  block_on_critical: true
  block_on_high: true
ci_policy:
  require_sonar: true
  require_security_scan: true
  enforce_pr_checks: true
`.trimStart();

const YAML_PROFILE_WITH_COMMENTS = `
tenant_id: acme-sandbox # tenant
github_owner: acme-org
sonar_org: acme-org
npm_scope: "@acme"
quality_policy:
  min_quality_score: 80 # minimum score
  block_on_critical: true
  block_on_high: true
ci_policy:
  require_sonar: true
  require_security_scan: true
  enforce_pr_checks: true
`.trimStart();

describe('resolveTenantContext', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    delete process.env.FORGE_TENANT_ID;
    delete process.env.FORGE_TENANT_PROFILE_REF;
  });

  it('loads and validates yaml tenant profile', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.yaml');
    writeFileSync(profilePath, YAML_PROFILE);

    const context = resolveTenantContext(tempDir, {
      tenant: 'acme-sandbox',
      'tenant-profile-ref': profilePath,
    });

    expect(context.tenantId).toBe('acme-sandbox');
    expect(context.profile.quality_policy.min_quality_score).toBe(80);
  });

  it('loads yaml profile with inline comments', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant-with-comments.yaml');
    writeFileSync(profilePath, YAML_PROFILE_WITH_COMMENTS);

    const context = resolveTenantContext(tempDir, {
      tenant: 'acme-sandbox',
      'tenant-profile-ref': profilePath,
    });

    expect(context.profile.quality_policy.min_quality_score).toBe(80);
    expect(context.profile.ci_policy.enforce_pr_checks).toBe(true);
  });

  it('supports environment variable fallback', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.json');
    writeFileSync(
      profilePath,
      JSON.stringify(
        {
          tenant_id: 'acme-sandbox',
          github_owner: 'acme-org',
          sonar_org: 'acme-org',
          npm_scope: '@acme',
          quality_policy: {
            min_quality_score: 75,
            block_on_critical: true,
            block_on_high: true,
          },
          ci_policy: {
            require_sonar: true,
            require_security_scan: true,
            enforce_pr_checks: true,
          },
        },
        null,
        2,
      ),
    );

    process.env.FORGE_TENANT_ID = 'acme-sandbox';
    process.env.FORGE_TENANT_PROFILE_REF = profilePath;

    const context = resolveTenantContext(tempDir, {});
    expect(context.profile.npm_scope).toBe('@acme');
  });

  it('fails when tenant does not match profile', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.yaml');
    writeFileSync(profilePath, YAML_PROFILE);

    expect(() =>
      resolveTenantContext(tempDir, {
        tenant: 'wrong-tenant',
        'tenant-profile-ref': profilePath,
      }),
    ).toThrow('Tenant mismatch');
  });

  it('loads multiple tenant profiles through the same contract', () => {
    tempDir = makeTempDir();
    const acmePath = join(tempDir, 'acme.yaml');
    const enterprisePath = join(tempDir, 'enterprise.yaml');
    writeFileSync(acmePath, YAML_PROFILE);
    writeFileSync(enterprisePath, ENTERPRISE_PROFILE);

    const acme = resolveTenantContext(tempDir, {
      tenant: 'acme-sandbox',
      'tenant-profile-ref': acmePath,
    });
    const enterprise = resolveTenantContext(tempDir, {
      tenant: 'acme-enterprise',
      'tenant-profile-ref': enterprisePath,
    });

    expect(acme.profile.github_owner).toBe('acme-org');
    expect(enterprise.profile.github_owner).toBe('acme-enterprise');
  });

  // ── line 102: unsupported profile format ────────────────────────────────────

  it('throws for unsupported profile file extension', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.toml');
    writeFileSync(profilePath, '# toml content\n');

    expect(() =>
      resolveTenantContext(tempDir, {
        tenant: 'acme-sandbox',
        'tenant-profile-ref': profilePath,
      }),
    ).toThrow('Unsupported tenant profile format: .toml');
  });

  // ── line 139: invalid profile fields ────────────────────────────────────────

  it('throws when required profile fields are missing', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'partial.json');
    writeFileSync(
      profilePath,
      JSON.stringify({
        tenant_id: 'acme-sandbox',
        github_owner: 'acme-org',
        // missing sonar_org, npm_scope, quality_policy, ci_policy
      }),
    );

    expect(() =>
      resolveTenantContext(tempDir, {
        tenant: 'acme-sandbox',
        'tenant-profile-ref': profilePath,
      }),
    ).toThrow('Invalid tenant profile');
  });

  it('throws when profile is a primitive (not an object)', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'primitive.json');
    // null parses to null which fails isRecord check → 'Tenant profile must be an object'
    writeFileSync(profilePath, 'null');

    expect(() =>
      resolveTenantContext(tempDir, {
        tenant: 'acme-sandbox',
        'tenant-profile-ref': profilePath,
      }),
    ).toThrow('Tenant profile must be an object');
  });

  // ── line 150: file:// URL resolution ────────────────────────────────────────

  it('resolves file:// URL profile reference', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.json');
    writeFileSync(
      profilePath,
      JSON.stringify({
        tenant_id: 'acme-sandbox',
        github_owner: 'acme-org',
        sonar_org: 'acme-org',
        npm_scope: '@acme',
        quality_policy: {
          min_quality_score: 80,
          block_on_critical: true,
          block_on_high: true,
        },
        ci_policy: {
          require_sonar: true,
          require_security_scan: true,
          enforce_pr_checks: true,
        },
      }),
    );

    const fileUrl = `file://${profilePath}`;
    const context = resolveTenantContext(tempDir, {
      tenant: 'acme-sandbox',
      'tenant-profile-ref': fileUrl,
    });

    expect(context.tenantId).toBe('acme-sandbox');
    expect(context.profile.github_owner).toBe('acme-org');
  });

  // ── line 160: profile not found ─────────────────────────────────────────────

  it('throws when profile path does not exist', () => {
    tempDir = makeTempDir();

    expect(() =>
      resolveTenantContext(tempDir, {
        tenant: 'acme-sandbox',
        'tenant-profile-ref': 'nonexistent-profile.yaml',
      }),
    ).toThrow('Tenant profile not found');
  });

  // ── line 169: missing tenant id ─────────────────────────────────────────────

  it('throws when neither --tenant nor FORGE_TENANT_ID is set', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.yaml');
    writeFileSync(profilePath, YAML_PROFILE);

    expect(() =>
      resolveTenantContext(tempDir, {
        'tenant-profile-ref': profilePath,
      }),
    ).toThrow('Missing tenant context');
  });

  // ── line 179: missing profile ref ───────────────────────────────────────────

  it('throws when neither --tenant-profile-ref nor FORGE_TENANT_PROFILE_REF is set', () => {
    tempDir = makeTempDir();

    expect(() =>
      resolveTenantContext(tempDir, {
        tenant: 'acme-sandbox',
      }),
    ).toThrow('Missing tenant profile reference');
  });

  it('uses --tenant-profile fallback option', () => {
    tempDir = makeTempDir();
    const profilePath = join(tempDir, 'tenant.yaml');
    writeFileSync(profilePath, YAML_PROFILE);

    const context = resolveTenantContext(tempDir, {
      tenant: 'acme-sandbox',
      'tenant-profile': profilePath,
    });

    expect(context.tenantId).toBe('acme-sandbox');
  });
});
