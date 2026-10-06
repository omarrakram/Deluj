import type { Change } from "@/domain/types";

/** Which row changes a screen cares about (a guest phone only sees its own table). */
export function changeVisibleTo(change: Change, tableCode: string | undefined): boolean {
  if (!tableCode) return true;
  switch (change.table) {
    case "orders":
    case "requests":
      return change.row.tableCode === tableCode;
    case "activity":
    case "sessions":
      return false;
    default:
      return true;
  }
}
