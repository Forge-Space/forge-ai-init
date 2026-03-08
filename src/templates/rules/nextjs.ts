export function nextjsRules(): string {
  return `## Next.js
- Server Components by default — only add 'use client' when needed
- Keep client components small and focused (hooks, interactivity)
- No barrel exports (index.ts re-exports) — tree-shaking killer
- Use server actions for mutations, not API routes
- Dynamic imports for heavy client components: \`dynamic(() => import(...))\`
- Bundle budget: monitor with \`@next/bundle-analyzer\`
- Images: always use \`next/image\` with width/height or fill
- Metadata: use \`generateMetadata\` in page.tsx, not hardcoded
- Error boundaries: \`error.tsx\` at route segment level
- Loading states: \`loading.tsx\` for streaming, not manual spinners
- No \`useEffect\` for data fetching — use server components or React Query
- Route handlers return \`NextResponse.json()\`, not \`Response\``;
}
