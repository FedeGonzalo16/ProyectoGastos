import { describe, expect, it } from "vitest";
import { collectInvestmentGoalAlerts } from "@/lib/notifications/collectInvestmentGoalAlerts";

describe("collectInvestmentGoalAlerts", () => {
  it("no avisa si no hay meta definida", () => {
    expect(collectInvestmentGoalAlerts("user-1", null, 500, "2026-08")).toEqual([]);
  });

  it("no avisa si todavía no se llegó al mínimo", () => {
    expect(collectInvestmentGoalAlerts("user-1", 500, 200, "2026-08")).toEqual([]);
  });

  it("avisa (una vez, positivo) cuando se alcanzó o superó el mínimo", () => {
    const [candidate] = collectInvestmentGoalAlerts("user-1", 500, 500, "2026-08");

    expect(candidate).toMatchObject({
      userId: "user-1",
      kind: "investment_goal_reached",
      entityId: "goal",
      period: "2026-08",
    });
    expect(candidate.body).toContain("500");
  });

  it("también avisa si se superó el mínimo, no solo si coincide justo", () => {
    expect(collectInvestmentGoalAlerts("user-1", 500, 900, "2026-08")).toHaveLength(1);
  });
});
