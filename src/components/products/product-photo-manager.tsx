"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";

import type { ProblemDetails } from "@/lib/http/problem";
import type { ProductPhotoView } from "@/modules/media/application/media-repository";

interface ProductPhotoManagerProps {
  productId: string;
  initialPhotos: ProductPhotoView[];
  initialVersion: number;
}

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as ProblemDetails;
    return new Error(body.detail ?? body.title);
  } catch {
    return new Error("Não foi possível atualizar as fotos.");
  }
}

export function ProductPhotoManager({
  productId,
  initialPhotos,
  initialVersion,
}: ProductPhotoManagerProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("Enviando foto…");
    setError(null);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("expectedVersion", String(version));
      const response = await fetch(`/api/products/${productId}/photos`, {
        method: "POST",
        body: data,
      });
      if (!response.ok) throw await responseError(response);
      const photo = (await response.json()) as ProductPhotoView;
      setPhotos((current) => [...current, photo]);
      setVersion((current) => current + 1);
      setStatus(null);
      event.target.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha no envio.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setBusy(true);
    setStatus("Atualizando fotos…");
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/photos/order`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: version,
          photoIds: reordered.map((photo) => photo.id),
        }),
      });
      if (!response.ok) throw await responseError(response);
      setPhotos((await response.json()) as ProductPhotoView[]);
      setVersion((current) => current + 1);
      setStatus(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao reordenar.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: ProductPhotoView) {
    setBusy(true);
    setStatus("Atualizando fotos…");
    setError(null);
    try {
      const response = await fetch(
        `/api/products/${productId}/photos/${photo.id}`,
        {
          method: "DELETE",
          headers: { "if-match": `"${version}"` },
        },
      );
      if (!response.ok) throw await responseError(response);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setVersion((current) => current + 1);
      setStatus(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao remover.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="photo-manager" aria-labelledby="photo-manager-title">
      <div className="photo-manager__header">
        <div>
          <h2 id="photo-manager-title">Fotos</h2>
          <p>JPEG, PNG ou WebP. Até 20 fotos, 10 MiB cada.</p>
        </div>
        <label className="primary-action photo-upload">
          Adicionar foto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={upload}
            disabled={busy || photos.length >= 20}
          />
        </label>
      </div>

      {status ? <p role="status" className="form-message">{status}</p> : null}
      {error ? <p role="alert" className="form-message form-message--error">{error}</p> : null}

      <div className="photo-grid">
        {photos.map((photo, index) => (
          <article className="photo-item" key={photo.id}>
            {photo.readUrl ? (
              <Image
                src={photo.readUrl}
                alt={`Foto ${index + 1} do produto`}
                width={photo.width}
                height={photo.height}
                unoptimized
              />
            ) : null}
            <div className="photo-item__actions">
              <button
                type="button"
                aria-label={`Mover foto ${index + 1} para a esquerda`}
                onClick={() => move(index, -1)}
                disabled={busy || index === 0}
              >
                ←
              </button>
              <button
                type="button"
                aria-label={`Mover foto ${index + 1} para a direita`}
                onClick={() => move(index, 1)}
                disabled={busy || index === photos.length - 1}
              >
                →
              </button>
              <button
                type="button"
                aria-label={`Remover foto ${index + 1}`}
                onClick={() => remove(photo)}
                disabled={busy}
              >
                Remover
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
