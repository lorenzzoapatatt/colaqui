import { describe, expect, it } from "vitest";

import { resolveE2EDatabaseUrl } from "@/lib/testing/e2e-database";

describe("resolveE2EDatabaseUrl", () => {
  const applicationUrl = "postgresql://colaqui:secret@localhost:55432/colaqui";

  it("derives the isolated E2E database from the application URL", () => {
    expect(resolveE2EDatabaseUrl(applicationUrl)).toBe(
      "postgresql://colaqui:secret@localhost:55432/colaqui_e2e",
    );
  });

  it("accepts an explicit URL only when it targets colaqui_e2e", () => {
    expect(
      resolveE2EDatabaseUrl(
        applicationUrl,
        "postgresql://runner:secret@postgres:5432/colaqui_e2e?schema=public",
      ),
    ).toBe(
      "postgresql://runner:secret@postgres:5432/colaqui_e2e?schema=public",
    );
  });

  it("rejects an explicit URL that could migrate a non-test database", () => {
    expect(() =>
      resolveE2EDatabaseUrl(
        applicationUrl,
        "postgresql://colaqui:secret@localhost:55432/colaqui",
      ),
    ).toThrow("E2E_DATABASE_URL deve apontar exclusivamente para colaqui_e2e");
  });
});
