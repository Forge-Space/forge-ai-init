export function svelteRules(): string {
  return `## Svelte
- Use runes (\`$state\`, \`$derived\`, \`$effect\`) in Svelte 5
- Components under 200 lines — extract logic into modules
- Use \`{#snippet}\` blocks for reusable markup fragments
- Prefer stores for shared state across components
- Use TypeScript in \`<script lang="ts">\` tags
- No direct DOM manipulation — use bindings and actions
- Use \`$props()\` rune for component inputs with defaults
- Load data in \`+page.server.ts\` / \`+layout.server.ts\`
- Use form actions for mutations — not fetch in components
- Run \`svelte-check\` in CI for type and a11y validation`;
}
