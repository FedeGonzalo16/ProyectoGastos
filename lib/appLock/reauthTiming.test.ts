import { describe, expect, it } from "vitest";
import { REAUTH_THRESHOLD_MS, shouldRelock } from "@/lib/appLock/reauthTiming";

describe("shouldRelock", () => {
  it("false si todavía no pasó el umbral", () => {
    expect(shouldRelock(1000, 1000 + REAUTH_THRESHOLD_MS - 1)).toBe(false);
  });

  it("true justo al llegar al umbral, y más allá", () => {
    expect(shouldRelock(1000, 1000 + REAUTH_THRESHOLD_MS)).toBe(true);
    expect(shouldRelock(1000, 1000 + REAUTH_THRESHOLD_MS + 5000)).toBe(true);
  });

  it("acepta un umbral custom en vez del default", () => {
    expect(shouldRelock(0, 500, 1000)).toBe(false);
    expect(shouldRelock(0, 1000, 1000)).toBe(true);
  });
});
