import { describe, expect, it } from "vitest";
import { hashPin } from "@/lib/appLock/pinHash";

describe("hashPin", () => {
  it("da el mismo hash para el mismo PIN", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    expect(a).toBe(b);
  });

  it("da un hash distinto para PIN distintos", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("4321");
    expect(a).not.toBe(b);
  });

  it("el hash nunca contiene el PIN en texto plano", async () => {
    const hash = await hashPin("1234");
    expect(hash).not.toContain("1234");
  });
});
