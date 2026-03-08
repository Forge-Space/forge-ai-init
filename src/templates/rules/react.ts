export function reactRules(): string {
  return `## React
- Functional components only — no class components
- Custom hooks for reusable logic (\`use\` prefix required)
- Memoize expensive computations with \`useMemo\`, not components
- Avoid \`useEffect\` for derived state — compute during render
- Keys: use stable IDs, never array indices for dynamic lists
- Event handlers: \`handleX\` naming (handleClick, handleSubmit)
- Accessibility: all interactive elements need labels and roles
- Forms: controlled components with validation feedback
- State: colocate state — lift only when shared
- Props: destructure in parameter, no spreading \`{...props}\` blindly`;
}
