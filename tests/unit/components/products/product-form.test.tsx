import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductForm } from "@/components/products/product-form";

const product = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Cadeira de madeira",
  description:
    "Cadeira usada em bom estado, firme e pronta para uma nova casa.",
  condition: "GOOD" as const,
  priceCents: 12_345,
  categoryHint: "Móveis",
  brand: "Artesanal",
  locationText: "São Paulo - SP",
  postalCode: "01001-000",
  quantity: 1 as const,
  status: "DRAFT" as const,
  version: 7,
  soldAt: null,
  archivedAt: null,
  createdAt: new Date("2026-10-29T12:00:00.000Z"),
  updatedAt: new Date("2026-10-29T12:00:00.000Z"),
};

describe("ProductForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exposes Portuguese labels, all conditions, and accessible help", () => {
    render(<ProductForm mode="create" />);

    expect(screen.getByLabelText("Título")).toBeRequired();
    expect(screen.getByLabelText("Descrição")).toBeRequired();
    expect(screen.getByLabelText("Preço (R$)")).toHaveAttribute(
      "inputmode",
      "decimal",
    );
    expect(screen.getByLabelText("Estado do item")).toHaveTextContent("Novo");
    expect(screen.getByLabelText("Estado do item")).toHaveTextContent(
      "Como novo",
    );
    expect(screen.getByLabelText("Estado do item")).toHaveTextContent("Bom");
    expect(screen.getByLabelText("Estado do item")).toHaveTextContent("Regular");
    expect(screen.getByLabelText("Estado do item")).toHaveTextContent("Ruim");
  });

  it("sends integer centavos and the expected version when editing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...product, version: 8 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductForm mode="edit" product={product} />);

    fireEvent.change(screen.getByLabelText("Preço (R$)"), {
      target: { value: "1.234,56" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/products/${product.id}`);
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(String(request.body))).toMatchObject({
      priceCents: 123_456,
      expectedVersion: 7,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Produto salvo.");
  });

  it("shows a server error without clearing the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: "about:blank",
            status: 409,
            title: "Produto alterado",
            detail: "Recarregue e tente novamente.",
          }),
          { status: 409, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(<ProductForm mode="edit" product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Recarregue e tente novamente.",
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Cadeira de madeira");
  });
});
