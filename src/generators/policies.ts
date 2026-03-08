import type { DetectedStack, Tier } from '../types.js';

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: Array<{ type: string; message: string }>;
  enabled: boolean;
}

interface Policy {
  id: string;
  name: string;
  version: string;
  description: string;
  rules: PolicyRule[];
}

function securityPolicy(): Policy {
  return {
    id: 'forge-security',
    name: 'Forge Security Policy',
    version: '1.0.0',
    description: 'Zero secrets, authentication enforcement',
    rules: [
      {
        id: 'sec-001',
        name: 'Block secret exposure',
        description: 'Block content containing credentials',
        conditions: [
          {
            field: 'content',
            operator: 'matches',
            value: '(password|secret|api_key|private_key|token)\\s*[:=]\\s*[\'"][^\'"]{8,}',
          },
        ],
        actions: [
          { type: 'block', message: 'Content contains potential secret' },
        ],
        enabled: true,
      },
      {
        id: 'sec-002',
        name: 'Unauthenticated access',
        description: 'Block unauthenticated requests',
        conditions: [
          { field: 'auth.authenticated', operator: 'eq', value: false },
        ],
        actions: [
          { type: 'block', message: 'Authentication required' },
        ],
        enabled: true,
      },
    ],
  };
}

function qualityPolicy(): Policy {
  return {
    id: 'forge-quality',
    name: 'Forge Quality Policy',
    version: '1.0.0',
    description: 'Lint pass, test existence, coverage threshold',
    rules: [
      {
        id: 'qual-001',
        name: 'Lint check required',
        description: 'Block if lint check has not passed',
        conditions: [
          { field: 'quality.lint_passed', operator: 'eq', value: false },
        ],
        actions: [
          { type: 'block', message: 'Lint check must pass' },
        ],
        enabled: true,
      },
      {
        id: 'qual-002',
        name: 'Tests required',
        description: 'Block if no tests exist for new modules',
        conditions: [
          { field: 'quality.has_tests', operator: 'eq', value: false },
        ],
        actions: [
          { type: 'block', message: 'Tests are required for new modules' },
        ],
        enabled: true,
      },
      {
        id: 'qual-003',
        name: 'Coverage threshold',
        description: 'Warn if test coverage drops below 80%',
        conditions: [
          { field: 'quality.coverage_percent', operator: 'lt', value: 80 },
        ],
        actions: [
          { type: 'warn', message: 'Test coverage below 80%' },
        ],
        enabled: true,
      },
    ],
  };
}

function compliancePolicy(): Policy {
  return {
    id: 'forge-compliance',
    name: 'Forge Compliance Policy',
    version: '1.0.0',
    description: 'RLS, audit logging, structured logging',
    rules: [
      {
        id: 'comp-001',
        name: 'Audit logging required',
        description: 'Warn if audit logging is not configured',
        conditions: [
          { field: 'compliance.audit_logging', operator: 'eq', value: false },
        ],
        actions: [
          { type: 'warn', message: 'Audit logging should be enabled' },
        ],
        enabled: true,
      },
      {
        id: 'comp-002',
        name: 'Correlation IDs required',
        description: 'Warn if requests lack correlation IDs',
        conditions: [
          { field: 'request.correlation_id', operator: 'eq', value: null },
        ],
        actions: [
          { type: 'warn', message: 'Requests should include correlation ID' },
        ],
        enabled: true,
      },
    ],
  };
}

function frameworkRules(stack: DetectedStack): PolicyRule[] {
  const rules: PolicyRule[] = [];

  if (stack.framework === 'nextjs' || stack.framework === 'react') {
    rules.push({
      id: 'fw-001',
      name: 'Accessibility required',
      description: 'Warn if components lack ARIA attributes',
      conditions: [
        { field: 'quality.a11y_passed', operator: 'eq', value: false },
      ],
      actions: [
        { type: 'warn', message: 'Components must pass accessibility checks' },
      ],
      enabled: true,
    });
  }

  if (stack.framework === 'nextjs') {
    rules.push({
      id: 'fw-002',
      name: 'Bundle size limit',
      description: 'Warn if JS bundle exceeds 300 KB gzipped',
      conditions: [
        { field: 'performance.bundle_size_kb', operator: 'gt', value: 300 },
      ],
      actions: [
        { type: 'warn', message: 'JS bundle exceeds 300 KB gzipped' },
      ],
      enabled: true,
    });
  }

  if (
    stack.framework === 'express' ||
    stack.framework === 'nestjs' ||
    stack.framework === 'fastapi'
  ) {
    rules.push({
      id: 'fw-003',
      name: 'API input validation',
      description: 'Block if API endpoints lack input validation',
      conditions: [
        { field: 'security.unvalidated_endpoints', operator: 'gt', value: 0 },
      ],
      actions: [
        { type: 'block', message: 'API endpoints must validate input' },
      ],
      enabled: true,
    });
  }

  return rules;
}

function scorecardConfig(stack: DetectedStack): Record<string, unknown> {
  const weights: Record<string, number> = {
    security: 25,
    quality: 30,
    performance: 20,
    compliance: 25,
  };

  if (stack.framework === 'nextjs') {
    weights.performance = 30;
    weights.compliance = 20;
  }

  if (
    stack.framework === 'express' ||
    stack.framework === 'fastapi' ||
    stack.framework === 'nestjs'
  ) {
    weights.security = 35;
    weights.performance = 15;
  }

  return {
    threshold: 60,
    collectors: ['security', 'quality', 'performance', 'compliance'],
    output: 'summary',
    weights,
  };
}

export interface PolicyFile {
  path: string;
  content: string;
}

export function generatePolicies(
  stack: DetectedStack,
  tier: Tier,
): PolicyFile[] {
  if (tier !== 'enterprise') return [];

  const files: PolicyFile[] = [];

  const policies: Policy[] = [
    securityPolicy(),
    qualityPolicy(),
    compliancePolicy(),
  ];

  for (const policy of policies) {
    files.push({
      path: `.forge/policies/${policy.id.replace('forge-', '')}.policy.json`,
      content: JSON.stringify(policy, null, 2) + '\n',
    });
  }

  const fwRules = frameworkRules(stack);
  if (fwRules.length > 0) {
    const fwPolicy: Policy = {
      id: 'forge-framework',
      name: 'Forge Framework Policy',
      version: '1.0.0',
      description: `Framework-specific rules for ${stack.framework}`,
      rules: fwRules,
    };
    files.push({
      path: '.forge/policies/framework.policy.json',
      content: JSON.stringify(fwPolicy, null, 2) + '\n',
    });
  }

  files.push({
    path: '.forge/scorecard.json',
    content: JSON.stringify(scorecardConfig(stack), null, 2) + '\n',
  });

  files.push({
    path: '.forge/features.json',
    content: JSON.stringify({ toggles: [], version: '1.0.0' }, null, 2) + '\n',
  });

  return files;
}
