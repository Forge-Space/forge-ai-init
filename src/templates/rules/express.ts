export function expressRules(): string {
  return `## Express
- Middleware order matters: CORS → body parser → auth → routes → error handler
- Error handling: async route handlers need try/catch or express-async-errors
- Route organization: \`/routes/<resource>.ts\` with \`Router()\`
- Request validation middleware before route handlers
- Use \`helmet()\` for security headers
- No business logic in route handlers — delegate to services
- Response format: consistent \`{ data, error, meta }\` envelope
- Logging middleware: request method, path, status, duration`;
}
