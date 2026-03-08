import type { DetectedStack } from '../types.js';

interface McpServer {
  command: string;
  args: string[];
}

export function generateMcpConfig(
  stack: DetectedStack,
): Record<string, McpServer> {
  const servers: Record<string, McpServer> = {};

  servers['context7'] = {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
  };

  if (stack.framework === 'nextjs' || stack.framework === 'remix') {
    servers['playwright'] = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
    };
  }

  return servers;
}
