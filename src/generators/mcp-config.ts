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

  if (
    stack.framework === 'nextjs' ||
    stack.framework === 'remix' ||
    stack.framework === 'sveltekit' ||
    stack.framework === 'nuxt' ||
    stack.framework === 'astro'
  ) {
    servers['playwright'] = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
    };
  }

  if (stack.language === 'python') {
    servers['sequential-thinking'] = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    };
  }

  return servers;
}
