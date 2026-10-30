// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  assertProductTransition,
  parseCreateProductInput,
  PRODUCT_CONDITIONS,
} from "@/modules/products/domain/product";
import { computeProductSnapshotHash } from "@/modules/products/domain/product-version";

const validProduct = {
  title: "  Cadeira de madeira  ",
  description:
    "  Cadeira usada em bom estado, firme e pronta para uma nova casa.  ",
  condition: "GOOD" as const,
  priceCents: 12_345,
  categoryHint: "  Móveis  ",
  brand: "  Artesanal  ",
  locationText: "  São Paulo - SP  ",
  postalCode: "  01001-000  ",
};

describe("product domain", () => {
  it("trims publishable text and fixes the quantity to one", () => {
    expect(parseCreateProductInput(validProduct)).toEqual({
      title: "Cadeira de madeira",
      description:
        "Cadeira usada em bom estado, firme e pronta para uma nova casa.",
      condition: "GOOD",
      priceCents: 12_345,
      categoryHint: "Móveis",
      brand: "Artesanal",
      locationText: "São Paulo - SP",
      postalCode: "01001-000",
      quantity: 1,
    });
  });

  it("enforces title, description, price, quantity, and condition boundaries", () => {
    expect(PRODUCT_CONDITIONS).toEqual([
      "NEW",
      "LIKE_NEW",
      "GOOD",
      "FAIR",
      "POOR",
    ]);
    expect(() =>
      parseCreateProductInput({ ...validProduct, title: "ab" }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, title: "a".repeat(121) }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, description: "a".repeat(29) }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, description: "a".repeat(6001) }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, priceCents: -1 }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, priceCents: 1_000_000_000 }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, priceCents: 12.5 }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, quantity: 2 }),
    ).toThrow();
    expect(() =>
      parseCreateProductInput({ ...validProduct, condition: "USED" }),
    ).toThrow();
  });

  it("accepts exact text and price boundaries", () => {
    expect(
      parseCreateProductInput({
        ...validProduct,
        title: "abc",
        description: "a".repeat(30),
        priceCents: 0,
      }).priceCents,
    ).toBe(0);
    expect(
      parseCreateProductInput({
        ...validProduct,
        title: "a".repeat(120),
        description: "a".repeat(6000),
        priceCents: 999_999_999,
      }).priceCents,
    ).toBe(999_999_999);
  });

  it("allows only the explicit forward lifecycle", () => {
    expect(() => assertProductTransition("DRAFT", "READY")).not.toThrow();
    expect(() => assertProductTransition("READY", "LISTED")).not.toThrow();
    expect(() => assertProductTransition("LISTED", "RESERVED")).not.toThrow();
    expect(() => assertProductTransition("RESERVED", "SOLD")).not.toThrow();
    expect(() => assertProductTransition("READY", "SOLD")).toThrow();
    expect(() => assertProductTransition("SOLD", "DRAFT")).toThrow();
  });

  it("computes a stable hash from publishable fields and ordered photos", () => {
    const first = computeProductSnapshotHash({
      ...parseCreateProductInput(validProduct),
      photoChecksums: ["checksum-a", "checksum-b"],
    });
    const same = computeProductSnapshotHash({
      ...parseCreateProductInput(validProduct),
      photoChecksums: ["checksum-a", "checksum-b"],
    });
    const reordered = computeProductSnapshotHash({
      ...parseCreateProductInput(validProduct),
      photoChecksums: ["checksum-b", "checksum-a"],
    });
    const edited = computeProductSnapshotHash({
      ...parseCreateProductInput(validProduct),
      title: "Cadeira de madeira restaurada",
      photoChecksums: ["checksum-a", "checksum-b"],
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(same).toBe(first);
    expect(reordered).not.toBe(first);
    expect(edited).not.toBe(first);
  });
});
