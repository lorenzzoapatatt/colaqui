import { z } from "zod";

import { InvalidProductTransitionError } from "@/modules/products/domain/product-errors";

export const PRODUCT_CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "POOR",
] as const;

export const PRODUCT_STATUSES = [
  "DRAFT",
  "READY",
  "LISTED",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
] as const;

export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || null);

const createProductSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(30).max(6_000),
  condition: z.enum(PRODUCT_CONDITIONS),
  priceCents: z.number().int().min(0).max(999_999_999),
  categoryHint: optionalText(120),
  brand: optionalText(120),
  locationText: optionalText(200),
  postalCode: optionalText(20),
  quantity: z.literal(1).optional().default(1),
});

export type ParsedProductInput = z.output<typeof createProductSchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;

export function parseCreateProductInput(input: unknown): ParsedProductInput {
  return createProductSchema.parse(input);
}

const allowedTransitions: Readonly<Record<ProductStatus, readonly ProductStatus[]>> = {
  DRAFT: ["READY"],
  READY: ["LISTED"],
  LISTED: ["RESERVED"],
  RESERVED: ["SOLD"],
  SOLD: [],
  ARCHIVED: [],
};

export function assertProductTransition(
  from: ProductStatus,
  to: ProductStatus,
): void {
  if (!allowedTransitions[from].includes(to)) {
    throw new InvalidProductTransitionError(from, to);
  }
}
