export function vueRules(): string {
  return `## Vue
- Composition API with \`<script setup>\` — no Options API
- Composables for reusable logic (\`use\` prefix: \`useAuth\`, \`useFetch\`)
- Props: define with \`defineProps<T>()\` for type safety
- Emits: define with \`defineEmits<T>()\` — no inline event names
- Reactive state: \`ref()\` for primitives, \`reactive()\` for objects
- Computed properties for derived state, not watchers
- Template refs: \`useTemplateRef()\` (Vue 3.5+)
- Components: PascalCase, single-file (.vue), max 200 lines
- Provide/inject for deep dependency passing, not prop drilling
- Pinia for global state — no Vuex`;
}
