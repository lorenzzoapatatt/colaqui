"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  formatCentsForInput,
  parseBRLToCents,
} from "@/lib/format/money";
import type { ProblemDetails } from "@/lib/http/problem";
import type { ProductView } from "@/modules/products/application/product-repository";

const CONDITION_OPTIONS = [
  ["NEW", "Novo"],
  ["LIKE_NEW", "Como novo"],
  ["GOOD", "Bom"],
  ["FAIR", "Regular"],
  ["POOR", "Ruim"],
] as const;

export type ProductFormProps =
  | { mode: "create"; product?: never }
  | { mode: "edit"; product: ProductView };

export function ProductForm({ mode, product }: ProductFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSavedProductId(null);

    try {
      const data = new FormData(event.currentTarget);
      const payload = {
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        condition: String(data.get("condition") ?? ""),
        priceCents: parseBRLToCents(String(data.get("price") ?? "")),
        categoryHint: String(data.get("categoryHint") ?? ""),
        brand: String(data.get("brand") ?? ""),
        locationText: String(data.get("locationText") ?? ""),
        postalCode: String(data.get("postalCode") ?? ""),
        ...(mode === "edit" ? { expectedVersion: product.version } : {}),
      };
      const response = await fetch(
        mode === "edit" ? `/api/products/${product.id}` : "/api/products",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as ProductView | ProblemDetails;
      if (!response.ok) {
        const problem = body as ProblemDetails;
        throw new Error(problem.detail ?? problem.title);
      }
      setSavedProductId((body as ProductView).id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o produto.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      {error ? <p role="alert" className="form-message form-message--error">{error}</p> : null}
      {savedProductId ? (
        <p role="status" className="form-message form-message--success">
          Produto salvo. <Link href={`/products/${savedProductId}`}>Abrir produto</Link>
        </p>
      ) : null}

      <div className="form-field form-field--wide">
        <label htmlFor="product-title">Título</label>
        <input
          id="product-title"
          name="title"
          defaultValue={product?.title}
          minLength={3}
          maxLength={120}
          required
        />
      </div>

      <div className="form-field form-field--wide">
        <label htmlFor="product-description">Descrição</label>
        <textarea
          id="product-description"
          name="description"
          defaultValue={product?.description}
          minLength={30}
          maxLength={6000}
          rows={7}
          required
        />
        <span className="field-hint">Conte o estado, medidas e detalhes importantes.</span>
      </div>

      <div className="form-field">
        <label htmlFor="product-condition">Estado do item</label>
        <select
          id="product-condition"
          name="condition"
          defaultValue={product?.condition ?? "GOOD"}
          required
        >
          {CONDITION_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="product-price">Preço (R$)</label>
        <input
          id="product-price"
          name="price"
          inputMode="decimal"
          defaultValue={
            product ? formatCentsForInput(product.priceCents) : undefined
          }
          placeholder="0,00"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="product-category">Categoria</label>
        <input id="product-category" name="categoryHint" defaultValue={product?.categoryHint ?? ""} maxLength={120} />
      </div>

      <div className="form-field">
        <label htmlFor="product-brand">Marca</label>
        <input id="product-brand" name="brand" defaultValue={product?.brand ?? ""} maxLength={120} />
      </div>

      <div className="form-field">
        <label htmlFor="product-location">Cidade ou região</label>
        <input id="product-location" name="locationText" defaultValue={product?.locationText ?? ""} maxLength={200} />
      </div>

      <div className="form-field">
        <label htmlFor="product-postal-code">CEP</label>
        <input id="product-postal-code" name="postalCode" defaultValue={product?.postalCode ?? ""} maxLength={20} inputMode="numeric" />
      </div>

      <div className="form-actions form-field--wide">
        <Link className="secondary-action" href={product ? `/products/${product.id}` : "/products"}>Cancelar</Link>
        <button type="submit" disabled={submitting}>
          {submitting
            ? "Salvando…"
            : mode === "edit"
              ? "Salvar alterações"
              : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}
