export function nodeRules(): string {
  return `## Node.js
- Validate ALL API input with a schema library (Zod, Joi, class-validator)
- Use proper HTTP status codes (400 client error, 500 server error)
- Rate limiting on all public endpoints
- CORS: explicit origin allowlist, never wildcard in production
- Structured logging (JSON) with request correlation IDs
- Graceful shutdown: handle SIGTERM, drain connections
- Environment config: validate at startup, fail fast on missing vars
- No \`require()\` — use ESM imports
- Connection pooling for databases
- Health check endpoint: \`GET /health\` returning 200`;
}
