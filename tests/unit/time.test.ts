import { describe, expect, it } from "vitest";
import { addDaysToKey, cairoDateKey, cairoHour, cairoWallToUtc, greetingFor } from "@/domain/time";
import { parseTableCode, tableLabel } from "@/domain/tables";
import { formatEGP } from "@/domain/money";

describe("Cairo time", () => {
  it("round-trips wall-clock times across DST", () => {
    for (const key of ["2026-01-15", "2026-07-15", "2026-10-06"]) {
      const d = cairoWallToUtc(key, 13 * 60 + 15);
      expect(cairoDateKey(d)).toBe(key);
      expect(cairoHour(d)).toBe(13);
    }
  });
  it("greets by Cairo time", () => {
    expect(greetingFor(cairoWallToUtc("2026-10-06", 9 * 60))).toBe("Good Morning");
    expect(greetingFor(cairoWallToUtc("2026-10-06", 14 * 60))).toBe("Good Afternoon");
    expect(greetingFor(cairoWallToUtc("2026-10-06", 20 * 60))).toBe("Good Evening");
  });
  it("adds days to keys", () => {
    expect(addDaysToKey("2026-10-01", -1)).toBe("2026-09-30");
  });
});

describe("tables and money", () => {
  it("parses table codes", () => {
    expect(parseTableCode("table-07")).toBe("table-07");
    expect(parseTableCode("7")).toBe("table-07");
    expect(parseTableCode("T7")).toBe("table-07");
    expect(parseTableCode("table-15")).toBeNull();
    expect(parseTableCode("table-00")).toBeNull();
    expect(parseTableCode("drop table")).toBeNull();
    expect(tableLabel("table-07")).toBe("Table 07");
  });
  it("formats EGP", () => {
    expect(formatEGP(1245)).toBe("EGP 1,245");
    expect(formatEGP(30)).toBe("EGP 30");
  });
});
