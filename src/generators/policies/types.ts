export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: Array<{ type: string; message: string }>;
  enabled: boolean;
}

export interface Policy {
  id: string;
  name: string;
  version: string;
  description: string;
  rules: PolicyRule[];
}

export interface PolicyFile {
  path: string;
  content: string;
}
