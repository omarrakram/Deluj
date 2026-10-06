// The server-side repository: the only code that persists demo state.
// Two implementations share the domain engine:
//   • SupabaseRepo — Postgres + Realtime, for the deployed multi-device demo
//   • MemoryRepo   — one Node process + Server-Sent Events, for local/LAN use
import "server-only";

import { todaysOrders } from "@/domain/analytics";
import type { Change, Command, CommandResult, DemoState } from "@/domain/types";

export interface Scope {
  /** When set, only this table's orders/requests are returned (guest phones). */
  tableCode?: string;
}

export interface ExecResult {
  result: CommandResult;
  changes: Change[];
  reset?: boolean;
}

export type Transport = "supabase" | "sse";

export interface Repo {
  kind: "memory" | "supabase";
  transport: Transport;
  snapshot(scope: Scope): Promise<DemoState>;
  execute(cmd: Command): Promise<ExecResult>;
}

/** Narrow a full state to what a screen needs: today's rows, or one table's rows for a guest's phone. */
export function scopeState(state: DemoState, scope: Scope, now: number): DemoState {
  const today = todaysOrders(state.orders, now);
  if (!scope.tableCode) return { ...state, orders: today };
  return {
    ...state,
    orders: today.filter((o) => o.tableCode === scope.tableCode),
    requests: state.requests.filter((r) => r.tableCode === scope.tableCode),
    activity: [],
    sessions: state.sessions.filter((s) => s.tableCode === scope.tableCode),
  };
}
