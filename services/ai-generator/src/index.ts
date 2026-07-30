// ⚡ Load .env before anything else reads process.env
import './env-loader';
import express, { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './middleware/request-id';
import { requireAuth, AuthenticatedRequest } from './middleware/auth';
import generateRouter from './routes/generate';
import { warmCatalog } from './lib/catalog';
import { metricsHandler } from './lib/metrics';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3002', 10);

// Request ID must be first so every subsequent handler has req.requestId
app.use(requestIdMiddleware);

// Structured JSON request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const entry = JSON.stringify({
      level,
      service: 'ai-generator',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      requestId: req.requestId,
    });
    if (res.statusCode >= 500) console.error(entry);
    else if (res.statusCode >= 400) console.warn(entry);
    else console.log(entry);
  });
  next();
});

app.use(express.json());

// ── Public probes — no auth required ─────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai-generator', port: PORT });
});

// Prometheus metrics — public, no auth
app.get('/metrics', metricsHandler as unknown as (req: Request, res: Response) => void);

// All routes below require a valid Cognito access token
app.use(requireAuth);

// Example protected route — returns the authenticated caller's identity
app.get('/whoami', (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user ?? null });
});

// AI generation endpoints
app.use('/generate', generateRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const rid = req.requestId || '-';
  console.error(`[${rid}] [ai-generator] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal server error', ref: rid });
});

// Bind to loopback, matching every sibling service (credential-service, execution-engine,
// trigger-service, … all pass '127.0.0.1'). Omitting the host makes Express listen on
// 0.0.0.0, and production was verified doing exactly that: `ss -ltnp` showed 3002 on `*`
// while every other internal service sat on 127.0.0.1.
//
// This service executes arbitrary prompts against Gemini and carries no auth middleware, so
// an external binding is an unauthenticated, billable endpoint. The only caller is the
// worker, which reaches it at http://localhost:3002 — loopback is sufficient.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[ai-generator] Listening on 127.0.0.1:${PORT}`);
  // Pre-warm the node catalog cache so the first request doesn't pay the fetch cost
  warmCatalog().catch(() => {});
});

export default app;
