import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductPhotoManager } from "@/components/products/product-photo-manager";
import type { ProductPhotoView } from "@/modules/media/application/media-repository";

const productId = "00000000-0000-4000-8000-000000000001";
const firstId = "00000000-0000-4000-8000-000000000011";
const secondId = "00000000-0000-4000-8000-000000000012";

function photo(id: string, order: number): ProductPhotoView {
  return {
    id,
    productId,
    objectKey: `${id}/original`,
    processedObjectKey: `${id}/normalized.jpg`,
    bucket: "colaqui",
    mimeType: "image/jpeg",
    sizeBytes: 100,
    width: 120,
    height: 80,
    checksum: `checksum-${id}`,
    sortOrder: order,
    createdAt: new Date("2026-10-29T12:00:00.000Z"),
    updatedAt: new Date("2026-10-29T12:00:00.000Z"),
    readUrl: `http://localhost:9000/colaqui/${id}`,
  };
}

describe("ProductPhotoManager", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("offers touch-friendly, labeled movement controls and persists order", async () => {
    const first = photo(firstId, 0);
    const second = photo(secondId, 1);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([second, first]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ProductPhotoManager
        productId={productId}
        initialPhotos={[first, second]}
        initialVersion={3}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Mover foto 1 para a esquerda" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Mover foto 1 para a direita" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/products/${productId}/photos/order`,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      expectedVersion: 3,
      photoIds: [secondId, firstId],
    });
    expect(screen.getAllByRole("img")[0]).toHaveAttribute(
      "alt",
      "Foto 1 do produto",
    );
  });

  it("removes metadata through the API and keeps a visible progress state", async () => {
    const first = photo(firstId, 0);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ProductPhotoManager
        productId={productId}
        initialPhotos={[first]}
        initialVersion={4}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover foto 1" }));

    expect(screen.getByRole("status")).toHaveTextContent("Atualizando fotos");
    await waitFor(() => expect(screen.queryAllByRole("img")).toHaveLength(0));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/products/${productId}/photos/${firstId}`,
      expect.objectContaining({
        method: "DELETE",
        headers: { "if-match": '"4"' },
      }),
    );
  });

  it("uploads one selected image with the current product version", async () => {
    const uploaded = photo(firstId, 0);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(uploaded), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ProductPhotoManager
        productId={productId}
        initialPhotos={[]}
        initialVersion={1}
      />,
    );
    const file = new File([new Uint8Array([1, 2, 3])], "foto.png", {
      type: "image/png",
    });

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [file] },
    });

    expect(screen.getByRole("status")).toHaveTextContent("Enviando foto");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("expectedVersion")).toBe("1");
    expect(await screen.findByRole("img")).toHaveAttribute(
      "alt",
      "Foto 1 do produto",
    );
  });
});
