// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationRequiredError } from "@/modules/auth/domain/auth-errors";
import {
  ProductHasActiveListingsError,
  ProductNotFoundError,
  ProductVersionConflictError,
} from "@/modules/products/domain/product-errors";

const mocks = vi.hoisted(() => ({
  archiveProduct: vi.fn(),
  createProduct: vi.fn(),
  getProduct: vi.fn(),
  listProducts: vi.fn(),
  requireRequestOwner: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock("@/modules/auth/presentation/require-request-owner", () => ({
  requireRequestOwner: mocks.requireRequestOwner,
}));
vi.mock("@/modules/products/application/archive-product", () => ({
  archiveProduct: mocks.archiveProduct,
}));
vi.mock("@/modules/products/application/create-product", () => ({
  createProduct: mocks.createProduct,
}));
vi.mock("@/modules/products/application/get-product", () => ({
  getProduct: mocks.getProduct,
}));
vi.mock("@/modules/products/application/list-products", () => ({
  listProducts: mocks.listProducts,
}));
vi.mock("@/modules/products/application/update-product", () => ({
  updateProduct: mocks.updateProduct,
}));

import {
  GET as listGet,
  POST as createPost,
} from "@/app/api/products/route";
import {
  DELETE as archiveDelete,
  GET as detailGet,
  PATCH as updatePatch,
} from "@/app/api/products/[productId]/route";

const productId = "00000000-0000-4000-8000-000000000001";
const product = {
  id: productId,
  title: "Cadeira de madeira",
  description:
    "Cadeira usada em bom estado, firme e pronta para uma nova casa.",
  condition: "GOOD",
  priceCents: 12_345,
  categoryHint: null,
  brand: null,
  locationText: null,
  postalCode: null,
  quantity: 1,
  status: "DRAFT",
  version: 1,
  soldAt: null,
  archivedAt: null,
  createdAt: new Date("2026-10-29T12:00:00.000Z"),
  updatedAt: new Date("2026-10-29T12:00:00.000Z"),
};

const context = (id = productId) => ({
  params: Promise.resolve({ productId: id }),
});

describe("product Route Handlers", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireRequestOwner.mockResolvedValue({ id: "owner-id" });
  });

  it("returns ProblemDetails when unauthenticated", async () => {
    mocks.requireRequestOwner.mockRejectedValue(new AuthenticationRequiredError());

    const response = await listGet(
      new Request("http://localhost:3000/api/products"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      type: "about:blank",
      status: 401,
      title: "Autenticação necessária",
    });
    expect(mocks.listProducts).not.toHaveBeenCalled();
  });

  it("creates a product with status 201 and an ETag version", async () => {
    mocks.createProduct.mockResolvedValue(product);
    const response = await createPost(
      new Request("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(product),
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("etag")).toBe('"1"');
    await expect(response.json()).resolves.toMatchObject({ id: productId, version: 1 });
  });

  it("rejects an invalid UUID before calling the product service", async () => {
    const response = await detailGet(
      new Request("http://localhost:3000/api/products/not-a-uuid"),
      context("not-a-uuid"),
    );

    expect(response.status).toBe(400);
    expect(mocks.getProduct).not.toHaveBeenCalled();
  });

  it("maps missing, stale, and active-listing errors to stable statuses", async () => {
    mocks.getProduct.mockRejectedValueOnce(new ProductNotFoundError());
    const missing = await detailGet(
      new Request(`http://localhost:3000/api/products/${productId}`),
      context(),
    );

    mocks.updateProduct.mockRejectedValueOnce(new ProductVersionConflictError());
    const stale = await updatePatch(
      new Request(`http://localhost:3000/api/products/${productId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: 1, title: "Título atualizado" }),
      }),
      context(),
    );

    mocks.archiveProduct.mockRejectedValueOnce(
      new ProductHasActiveListingsError(),
    );
    const activeListing = await archiveDelete(
      new Request(`http://localhost:3000/api/products/${productId}`, {
        method: "DELETE",
        headers: { "if-match": '"1"' },
      }),
      context(),
    );

    expect(missing.status).toBe(404);
    expect(stale.status).toBe(409);
    expect(activeListing.status).toBe(409);
    await expect(activeListing.json()).resolves.toMatchObject({
      title: "Produto possui anúncios ativos",
    });
  });
});
