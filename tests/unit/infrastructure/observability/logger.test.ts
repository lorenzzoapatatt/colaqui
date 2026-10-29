import { describe, expect, it } from "vitest";

import { redactSensitive } from "@/infrastructure/observability/logger";

describe("redactSensitive", () => {
  it("redacts nested secret-shaped keys without changing safe context", () => {
    expect(
      redactSensitive({
        productId: "product-1",
        authorization: "Bearer abc",
        nested: { refreshToken: "token", count: 2 },
      }),
    ).toEqual({
      productId: "product-1",
      authorization: "[REDACTED]",
      nested: { refreshToken: "[REDACTED]", count: 2 },
    });
  });
});
