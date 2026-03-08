export function scalabilityRules(): string {
  return `## Scalability & Performance

- Design for 10x current load from day one — avoid patterns that require rewrites to scale
- Database queries: always use indexes, avoid N+1, paginate all list endpoints
- API design: version from v1, use cursor pagination (not offset), set reasonable rate limits
- Caching strategy: define TTL for every cached value, invalidate explicitly, cache at the right layer
- Async by default: long-running operations go to queues, not request handlers
- Connection pooling: never create connections per request — pool DB, Redis, HTTP clients
- Bundle size budget: set limits per route, track in CI, alert on regression
- Lazy loading: split code by route, defer non-critical JS, use dynamic imports
- Stateless services: no in-memory state that prevents horizontal scaling
- Monitoring: structured logs with correlation IDs, metrics for latency/throughput/error rate
- Graceful degradation: circuit breakers for external services, fallback responses, retry with backoff`;
}
