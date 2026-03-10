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
});
