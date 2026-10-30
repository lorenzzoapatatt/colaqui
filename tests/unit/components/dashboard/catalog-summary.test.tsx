import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogSummary } from "@/components/dashboard/catalog-summary";
import { RecentProducts } from "@/components/dashboard/recent-products";
import type { ProductView } from "@/modules/products/application/product-repository";

const recentProduct: ProductView = {
  id: "00000000-0000-4000-8000-000000000001",
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

describe("dashboard catalog components", () => {
  it("renders every active status count, including zeros", () => {
    render(
      <CatalogSummary
        counts={{ DRAFT: 2, READY: 0, LISTED: 1, RESERVED: 0, SOLD: 3 }}
      />,
    );

    expect(screen.getByText("Rascunhos").closest("li")).toHaveTextContent("2");
    expect(screen.getByText("Prontos").closest("li")).toHaveTextContent("0");
    expect(screen.getByText("Anunciados").closest("li")).toHaveTextContent("1");
    expect(screen.getByText("Reservados").closest("li")).toHaveTextContent("0");
    expect(screen.getByText("Vendidos").closest("li")).toHaveTextContent("3");
    expect(screen.queryByText("Arquivados")).not.toBeInTheDocument();
  });

  it("links recent products to their detail pages and has an empty state", () => {
    const { rerender } = render(<RecentProducts products={[recentProduct]} />);
    expect(
      screen.getByRole("link", { name: "Cadeira de madeira" }),
    ).toHaveAttribute("href", `/products/${recentProduct.id}`);

    rerender(<RecentProducts products={[]} />);
    expect(screen.getByText("Seu catálogo ainda está vazio.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Cadastrar primeiro produto" }),
    ).toHaveAttribute("href", "/products/new");
  });
});
