import { describe, expect, it } from "vitest";

import { getHealth } from "@/modules/health/application/get-health";

describe("getHealth", () => {
  it("reports ok only when every dependency responds", async () => {
    const result = await getHealth({
      database: async () => undefined,
      storage: async () => undefined,
    });

    expect(result).toEqual({
      status: "ok",
      components: { database: "ok", storage: "ok" },
    });
  });

  it("reports the failing component without leaking its error", async () => {
    const result = await getHealth({
      database: async () => {
        throw new Error("postgresql://secret@database");
      },
      storage: async () => undefined,
    });

    expect(result).toEqual({
      status: "degraded",
      components: { database: "error", storage: "ok" },
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
