export function scalabilityReviewSkill(): string {
  return `---
name: scalability-review
description: Assess and enforce scalability patterns before they become production bottlenecks
---

# Scalability Review

## When to Use
- Before deploying a new service or API
- When adding database queries or new endpoints
- During architecture reviews for growing systems
- After load testing reveals bottlenecks
- When migrating from prototype to production

## Review Areas

### 1. Database Patterns
- **N+1 queries**: Loops making individual DB calls → use JOINs or batch queries
- **Missing indexes**: Columns in WHERE/ORDER BY/JOIN without indexes
- **Unbounded queries**: SELECT * without LIMIT → always paginate
- **Missing connection pool**: Creating connections per request → use pool
- **Schema flexibility**: Can the schema evolve without downtime migrations?

### 2. API Design
- **Pagination**: All list endpoints must use cursor pagination (not offset)
- **Rate limiting**: Every public endpoint has rate limits defined
- **Response size**: No endpoint returns >1MB without streaming
- **Versioning**: Breaking changes require new version (v1 → v2)
- **Idempotency**: Write operations are safe to retry (idempotency keys)

### 3. Caching Strategy
- **Cache layer**: Defined TTL per data type (user: 5min, config: 1hr, static: 24hr)
- **Invalidation**: Explicit cache busting on writes (no stale reads)
- **Cache stampede**: Protection against thundering herd on cache miss
- **Cache hierarchy**: L1 (in-memory) → L2 (Redis) → L3 (DB) with fallthrough

### 4. Async Processing
- **Queue usage**: Long operations (>500ms) go to background queues
- **Retry policy**: Failed jobs retry with exponential backoff + dead letter queue
- **Idempotent consumers**: Queue consumers can safely process the same message twice
- **Backpressure**: Queue consumers respect rate limits of downstream services

### 5. Observability
- **Structured logging**: JSON logs with correlation ID, timestamp, service, level
- **Metrics**: Latency p50/p95/p99, throughput, error rate per endpoint
- **Alerting**: Alerts on error rate >1%, latency p95 >2s, queue depth growing
- **Tracing**: Distributed traces across service boundaries

### 6. Horizontal Scaling Readiness
- **Stateless services**: No in-process state (sessions, caches) preventing scale-out
- **Shared-nothing**: Each instance can serve any request independently
- **Health checks**: GET /health returns 200 when ready, 503 when draining
- **Graceful shutdown**: SIGTERM → stop accepting → drain in-flight → exit

## Output
1. **Bottleneck Map**: Identified scaling limits with current capacity estimates
2. **Priority Fixes**: Changes needed before next traffic milestone (10x, 100x)
3. **Architecture Recommendations**: Patterns to adopt for long-term scalability
4. **Quick Wins**: Indexes, caching, pagination fixes achievable in hours
`;
}
