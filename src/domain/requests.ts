// Guest service requests ("Need anything?").

import { minutesBetween } from "./time";
import type { ServiceKind, ServiceRequest, ServiceStatus } from "./types";

export interface ServiceKindMeta {
  kind: ServiceKind;
  /** Button label on the guest's phone. */
  label: string;
  /** What the kitchen tablet shouts. */
  staffLabel: string;
  /** Live-feed phrasing: "Table 07 requested the bill". */
  activity: string;
}

export const SERVICE_KINDS: ServiceKindMeta[] = [
  { kind: "waiter", label: "Call waiter", staffLabel: "CALL WAITER", activity: "called a waiter" },
  { kind: "bill", label: "Request bill", staffLabel: "REQUEST BILL", activity: "requested the bill" },
  { kind: "water", label: "Water", staffLabel: "WATER", activity: "requested water" },
  { kind: "napkins", label: "Extra napkins", staffLabel: "EXTRA NAPKINS", activity: "requested extra napkins" },
  { kind: "cutlery", label: "Cutlery", staffLabel: "CUTLERY", activity: "requested cutlery" },
  { kind: "sauce", label: "Extra sauce", staffLabel: "EXTRA SAUCE", activity: "requested extra sauce" },
];

export const SERVICE_KIND_META: Record<ServiceKind, ServiceKindMeta> = Object.fromEntries(
  SERVICE_KINDS.map((k) => [k.kind, k]),
) as Record<ServiceKind, ServiceKindMeta>;

export function isServiceKind(value: unknown): value is ServiceKind {
  return typeof value === "string" && value in SERVICE_KIND_META;
}

export function isOpen(r: Pick<ServiceRequest, "status">): boolean {
  return r.status === "open" || r.status === "acknowledged";
}

/** An identical request that is still being handled: tapping again must not spam the team. */
export function findOpenDuplicate(
  requests: ServiceRequest[],
  tableCode: string,
  kind: ServiceKind,
): ServiceRequest | undefined {
  return requests.find((r) => r.tableCode === tableCode && r.kind === kind && isOpen(r));
}

export const RATE_LIMIT_WINDOW_MINUTES = 5;
export const RATE_LIMIT_MAX = 8;

export function isRateLimited(requests: ServiceRequest[], tableCode: string, now: number): boolean {
  const recent = requests.filter(
    (r) => r.tableCode === tableCode && minutesBetween(r.createdAt, now) < RATE_LIMIT_WINDOW_MINUTES,
  );
  return recent.length >= RATE_LIMIT_MAX;
}

export function canTransitionRequest(from: ServiceStatus, to: ServiceStatus): boolean {
  if (from === to) return false;
  if (from === "done") return false;
  if (from === "acknowledged") return to === "done";
  return to === "acknowledged" || to === "done";
}

export function withRequestStatus(r: ServiceRequest, to: ServiceStatus, nowIso: string): ServiceRequest {
  const next: ServiceRequest = { ...r, status: to, updatedAt: nowIso };
  if ((to === "acknowledged" || to === "done") && !next.acknowledgedAt) next.acknowledgedAt = nowIso;
  if (to === "done") next.completedAt = nowIso;
  return next;
}

export const REQUEST_STATUS_COPY: Record<ServiceStatus, string> = {
  open: "Sent · a team member has been notified",
  acknowledged: "On it · someone is heading over",
  done: "Done",
};
