import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOGS_DIR = join(process.cwd(), 'logs');

function ensureDir() {
  try { mkdirSync(LOGS_DIR, { recursive: true }); } catch { /* already exists */ }
}

function todayFile() {
  const d = new Date().toISOString().slice(0, 10);
  return join(LOGS_DIR, `submit-${d}.log`);
}

function writeEntry(entry: Record<string, unknown>) {
  ensureDir();
  try {
    appendFileSync(todayFile(), JSON.stringify(entry) + '\n', 'utf-8');
  } catch (e) {
    console.error('[logger] write failed:', e);
  }
}

// ── Step tracker returned by logger.step() ────────────────────────────────

export interface StepTracker {
  ok:   (data?: Record<string, unknown>) => void;
  fail: (err: unknown, data?: Record<string, unknown>) => void;
}

// ── Request-scoped logger ─────────────────────────────────────────────────

export interface RequestLogger {
  info:  (event: string, data?: Record<string, unknown>) => void;
  warn:  (event: string, data?: Record<string, unknown>) => void;
  error: (event: string, err: unknown, data?: Record<string, unknown>) => void;
  step:  (name: string, data?: Record<string, unknown>) => StepTracker;
}

export function createRequestLogger(reqId: string): RequestLogger {
  const reqStart = Date.now();

  function base(level: string, event: string, data?: Record<string, unknown>): Record<string, unknown> {
    return {
      ts:      new Date().toISOString(),
      reqId,
      level,
      event,
      totalMs: Date.now() - reqStart,
      ...data,
    };
  }

  function info(event: string, data?: Record<string, unknown>) {
    const entry = base('INFO', event, data);
    console.log(`\x1b[36m[${reqId}]\x1b[0m ${event}`, data ? JSON.stringify(data) : '');
    writeEntry(entry);
  }

  function warn(event: string, data?: Record<string, unknown>) {
    const entry = base('WARN', event, data);
    console.warn(`\x1b[33m[${reqId}] WARN\x1b[0m ${event}`, data ? JSON.stringify(data) : '');
    writeEntry(entry);
  }

  function error(event: string, err: unknown, data?: Record<string, unknown>) {
    const errInfo = err instanceof Error
      ? { message: err.message, stack: err.stack, name: err.name }
      : { raw: String(err) };

    const entry = base('ERROR', event, { ...data, error: errInfo });
    console.error(`\x1b[31m[${reqId}] ERROR\x1b[0m ${event}`, errInfo.message ?? errInfo.raw, '\n', errInfo.stack ?? '');
    writeEntry(entry);
  }

  function step(name: string, initData?: Record<string, unknown>): StepTracker {
    const stepStart = Date.now();
    const startEntry = base('INFO', 'step:start', { step: name, ...initData });
    console.log(`\x1b[36m[${reqId}]\x1b[0m ▶ ${name}`, initData ? JSON.stringify(initData) : '');
    writeEntry(startEntry);

    return {
      ok(data) {
        const ms = Date.now() - stepStart;
        const entry = base('INFO', 'step:ok', { step: name, stepMs: ms, ...data });
        console.log(`\x1b[32m[${reqId}]\x1b[0m ✔ ${name} (${ms}ms)`, data ? JSON.stringify(data) : '');
        writeEntry(entry);
      },
      fail(err, data) {
        const ms = Date.now() - stepStart;
        const errInfo = err instanceof Error
          ? { message: err.message, stack: err.stack, name: err.name }
          : { raw: String(err) };
        const entry = base('ERROR', 'step:fail', { step: name, stepMs: ms, error: errInfo, ...data });
        console.error(`\x1b[31m[${reqId}]\x1b[0m ✘ ${name} FAILED (${ms}ms):`, errInfo.message ?? errInfo.raw, '\n', errInfo.stack ?? '');
        writeEntry(entry);
      },
    };
  }

  return { info, warn, error, step };
}

// ── Read last N lines from today's log (for /api/logs) ───────────────────

export function readRecentLogs(maxLines = 200): unknown[] {
  const { readFileSync, existsSync } = require('fs') as typeof import('fs');
  const file = todayFile();
  if (!existsSync(file)) return [];

  const raw = readFileSync(file, 'utf-8');
  return raw
    .split('\n')
    .filter(Boolean)
    .slice(-maxLines)
    .map((line) => {
      try { return JSON.parse(line); } catch { return { raw: line }; }
    });
}
