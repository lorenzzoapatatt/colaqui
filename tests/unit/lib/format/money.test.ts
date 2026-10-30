import { describe, expect, it } from "vitest";

import {
  formatBRLFromCents,
  formatCentsForInput,
  parseBRLToCents,
} from "@/lib/format/money";

describe("Brazilian money formatting", () => {
  it("formats integer centavos as Brazilian reais", () => {
    expect(formatBRLFromCents(12_345)).toBe("R$ 123,45");
    expect(formatCentsForInput(12_345)).toBe("123,45");
  });

  it("parses typed values without floating-point arithmetic", () => {
    expect(parseBRLToCents("123,45")).toBe(12_345);
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123_456);
    expect(parseBRLToCents("0")).toBe(0);
    expect(parseBRLToCents("10,5")).toBe(1_050);
    expect(() => parseBRLToCents("12,345")).toThrow();
    expect(() => parseBRLToCents("texto")).toThrow();
  });
});
