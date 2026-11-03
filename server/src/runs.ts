// Run lifecycle: queue, detonate, verdict, receipt. Runs are kept in memory and saved as JSON files.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';
import { detonate, makeCanaries, type BoxEvent, type BoxResult } from './sandbox.ts';
import { factsFrom, writeVerdict, type Facts, type Verdict } from './verdict.ts';
import { signReceipt, type Receipt } from './receipt.ts';

export type Status = 'queued' | 'running' | 'judging' | 'done' | 'error';
export type Run = {
  id: string;
  kind: 'file' | 'link';
  name: string;
  size: number;
  sha256: string;
  sample?: string;
  status: Status;
  createdAt: string;
  events: (BoxEvent & { at: string })[];
  box?: Omit<BoxResult, 'report'> & { report?: Record<string, unknown> | null };
  facts?: Facts;
  verdict?: Verdict;
  receipt?: Receipt;
  error?: string;
};

const runs = new Map<string, Run>();
const listeners = new Map<string, Set<(e: BoxEvent & { at: string }) => void>>();
const queue: { run: Run; input: Buffer }[] = [];
let active = 0;
let counter = 400;

const runsDir = (): string => join(config.dataDir, 'runs');

export function loadRuns(): void {
  mkdirSync(runsDir(), { recursive: true });
  for (const f of readdirSync(runsDir()).filter((n) => n.endsWith('.json'))) {
    try {
      const r = JSON.parse(readFileSync(join(runsDir(), f), 'utf8')) as Run;
      if (r.status !== 'done') r.status = 'error';
      runs.set(r.id, r);
      counter = Math.max(counter, Number(r.id.replace(/\D/g, '')) || 0);
    } catch { /* skip a damaged file */ }
  }
}

function save(r: Run): void {
  writeFileSync(join(runsDir(), `${r.id}.json`), JSON.stringify(r));
}

function push(r: Run, e: BoxEvent): void {
  const ev = { ...e, at: new Date().toISOString() };
  if (e.type !== 'screenshot') r.events.push(ev);
  for (const fn of listeners.get(r.id) ?? []) fn(ev);
}

export function subscribe(id: string, fn: (e: BoxEvent & { at: string }) => void): () => void {
  const set = listeners.get(id) ?? new Set();
  set.add(fn);
  listeners.set(id, set);
  return () => { set.delete(fn); };
}

export function getRun(id: string): Run | undefined { return runs.get(id); }
export function listRuns(): Run[] { return [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

export function createRun(kind: 'file' | 'link', name: string, input: Buffer, sample?: string): Run {
  counter += 1;
  const r: Run = {
    id: `BBX-${String(counter).padStart(4, '0')}`, kind, name, size: input.length,
    sha256: createHash('sha256').update(input).digest('hex'), sample, status: 'queued', createdAt: new Date().toISOString(), events: [],
  };
  runs.set(r.id, r);
  save(r);
  queue.push({ run: r, input });
  pump();
  return r;
}

function pump(): void {
  while (active < config.maxConcurrent && queue.length) {
    const next = queue.shift();
    if (!next) return;
    active += 1;
    execute(next.run, next.input).finally(() => { active -= 1; pump(); });
  }
}

async function execute(r: Run, input: Buffer): Promise<void> {
  r.status = 'running';
  push(r, { type: 'stage', stage: 'starting' });
  const canaries = makeCanaries();
  const env: Record<string, string> = { BB_NAME: r.name, BB_CANARIES: JSON.stringify(canaries) };
  if (r.kind === 'link') {
    env.BB_URL = input.toString('utf8');
    if (config.gateUrl) env.BB_PROXY = config.gateUrl;
  }
  let box: BoxResult;
  try {
    box = await detonate({ kind: r.kind, name: r.name, input: r.kind === 'link' ? Buffer.alloc(0) : input, env }, (e) => push(r, e));
  } catch (e) {
    r.status = 'error';
    r.error = `The box could not run: ${(e as Error).message}`;
    push(r, { type: 'error', message: r.error });
    save(r);
    return;
  }
  const { report, ...rest } = box;
  r.box = { ...rest, report };
  if (!report) {
    r.status = 'error';
    r.error = box.error ?? 'The box returned no record.';
    push(r, { type: 'error', message: r.error });
    save(r);
    return;
  }

  r.status = 'judging';
  push(r, { type: 'stage', stage: 'verdict' });
  const facts = factsFrom(r.kind, r.name, report);
  r.facts = facts;
  const verdict = await writeVerdict(facts, report, (m) => push(r, { type: 'note', message: m }));
  r.verdict = verdict;
  r.receipt = signReceipt({
    product: 'Burn Box',
    run: r.id,
    what: r.name,
    kind: r.kind,
    sha256: r.sha256,
    container: box.container,
    limits: box.limits,
    canaries: { planted: r.kind === 'link' ? 1 : 3, reached: facts.canaries.length },
    egressBlocked: facts.egressTotal,
    verdict: verdict.level,
    verdictBy: verdict.source === 'vultr' ? `Vultr Serverless Inference (${verdict.model ?? 'model'})` : 'Burn Box rules',
    startedAt: box.startedAt,
    destroyedAt: box.destroyedAt,
    destroyed: box.destroyed,
  });
  r.status = 'done';
  push(r, { type: 'done', verdict: verdict.level });
  save(r);
}

export function samplesList(): { id: string; name: string; kind: 'file' | 'link'; blurb: string; available: boolean }[] {
  const has = (f: string): boolean => existsSync(join(config.samplesDir, f));
  return [
    { id: 'invoice', name: 'invoice_sample.py', kind: 'file', blurb: 'An "invoice helper" from an overdue invoice email', available: has('invoice_sample.py') },
    { id: 'phish', name: 'invoices-portal.lab.test/view', kind: 'link', blurb: 'A login page asking you to sign in to see an invoice', available: true },
    { id: 'benign', name: 'benign_sample.py', kind: 'file', blurb: 'A harmless script that writes one note', available: has('benign_sample.py') },
  ];
}

export function sampleInput(id: string): { kind: 'file' | 'link'; name: string; input: Buffer } | undefined {
  if (id === 'invoice' || id === 'benign') {
    const name = `${id}_sample.py`;
    return { kind: 'file', name, input: readFileSync(join(config.samplesDir, name)) };
  }
  if (id === 'phish') return { kind: 'link', name: 'invoices-portal.lab.test/view', input: Buffer.from('http://invoices-portal.lab.test/view?inv=88213') };
  return undefined;
}
