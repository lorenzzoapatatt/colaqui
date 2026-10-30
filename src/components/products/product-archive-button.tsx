"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProblemDetails } from "@/lib/http/problem";

export function ProductArchiveButton({
  productId,
  version,
}: {
  productId: string;
  version: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function archive() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: { "if-match": `"${version}"` },
      });
      if (!response.ok) {
        const problem = (await response.json()) as ProblemDetails;
        throw new Error(problem.detail ?? problem.title);
      }
      router.push("/products");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível arquivar.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="archive-action">
      <button type="button" onClick={archive} disabled={busy}>
        {busy ? "Arquivando…" : "Arquivar produto"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
