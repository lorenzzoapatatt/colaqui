import { describe, expect, it } from "vitest";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-metadata";

describe("app metadata", () => {
  it("identifies the product and its selling purpose", () => {
    expect(APP_NAME).toBe("Colaqui");
    expect(APP_DESCRIPTION.toLocaleLowerCase("pt-BR")).toContain("vender");
  });
});
