import type { DetectedStack } from '../types.js';
import type { QualityGate } from './types.js';

export function determineScalingStrategy(stack: DetectedStack): string {
  if (stack.framework === 'nextjs') {
    return 'Edge-first: Vercel/Cloudflare Workers for SSR, CDN for static, Supabase/Planetscale for data';
  }
  if (stack.framework === 'express' || stack.framework === 'nestjs') {
    return 'Horizontal: Container-based (Docker/K8s), load balancer, connection pooling, Redis cache';
  }
  if (stack.framework === 'fastapi' || stack.framework === 'django') {
    return 'ASGI workers (uvicorn/gunicorn), Redis queue for background tasks, read replicas for DB';
  }
  if (stack.framework === 'spring') {
    return 'JVM tuning, horizontal pod autoscaling, connection pooling, distributed cache';
  }
  if (stack.language === 'go') {
    return 'Goroutine-native concurrency, single binary deploy, horizontal scaling with load balancer';
  }
  if (stack.language === 'rust') {
    return 'Zero-cost abstractions, single binary deploy, tokio async runtime for IO-bound work';
  }
  return 'Start vertical (bigger instance), then horizontal (load balancer + stateless services)';
}

export function defineQualityGates(): QualityGate[] {
  return [
    {
      phase: 'Phase 1 — Foundation (40%)',
      threshold: 40,
      checks: ['no critical security findings', 'basic tests exist', 'CI pipeline runs'],
    },
    {
      phase: 'Phase 2 — Stabilization (60%)',
      threshold: 60,
      checks: ['linting enabled', 'type checking passes', '>50% test coverage', 'no high-severity findings'],
    },
    {
      phase: 'Phase 3 — Production (80%)',
      threshold: 80,
      checks: ['full governance enforcement', '>80% test coverage', 'all findings addressed', 'ARCHITECTURE.md current'],
    },
  ];
}
