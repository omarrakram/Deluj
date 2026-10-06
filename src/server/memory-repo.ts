// In-memory repository: state lives in this Node process and every connected
// screen receives changes over Server-Sent Events. Ideal for a laptop running
// `npm run demo:local` on a phone hotspot when the venue has no internet.
import "server-only";

import { applyCommand } from "@/domain/engine";
import { newId } from "@/domain/ids";
import { buildSeedState } from "@/domain/seed";
import { cairoDateKey } from "@/domain/time";
import type { Change, Command, DemoState } from "@/domain/types";
import { scopeState, type ExecResult, type Repo, type Scope } from "./repo";

export interface StreamMessage {
  changes: Change[];
  reset?: boolean;
}
type Listener = (msg: StreamMessage) => void;

interface MemoryStore {
  state: DemoState;
  listeners: Set<Listener>;
}

const g = globalThis as typeof globalThis & { __delujMemory?: MemoryStore };

function store(): MemoryStore {
  if (!g.__delujMemory) {
    g.__delujMemory = { state: buildSeedState(Date.now()), listeners: new Set() };
  }
  const s = g.__delujMemory;
  // A new Cairo business day starts from a fresh demo day.
  if (s.state.meta.businessDate !== cairoDateKey(Date.now())) {
    s.state = buildSeedState(Date.now(), s.state.meta.resetVersion + 1);
    broadcast(s, { changes: [{ table: "meta", op: "upsert", row: s.state.meta }], reset: true });
  }
  return s;
}

function broadcast(s: MemoryStore, msg: StreamMessage) {
  for (const l of s.listeners) {
    try {
      l(msg);
    } catch {
      s.listeners.delete(l);
    }
  }
}

export function subscribeMemory(listener: Listener): () => void {
  const s = store();
  s.listeners.add(listener);
  return () => s.listeners.delete(listener);
}

export const memoryRepo: Repo = {
  kind: "memory",
  transport: "sse",
  async snapshot(scope: Scope) {
    return scopeState(store().state, scope, Date.now());
  },
  async execute(cmd: Command): Promise<ExecResult> {
    const s = store();
    const out = applyCommand(s.state, cmd, { now: Date.now(), newId });
    s.state = out.state;
    if (out.changes.length) broadcast(s, { changes: out.changes, reset: out.reset });
    return { result: out.result, changes: out.changes, reset: out.reset };
  },
};
