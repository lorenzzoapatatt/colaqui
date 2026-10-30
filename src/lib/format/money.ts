const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRLFromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error("Centavos inválidos.");
  const absolute = Math.abs(cents);
  const reais = Math.trunc(absolute / 100);
  const centavos = String(absolute % 100).padStart(2, "0");
  const value = `${cents < 0 ? "-" : ""}${reais},${centavos}`;
  return BRL_FORMATTER.format(Number(value.replace(",", ".")));
}

export function formatCentsForInput(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Centavos inválidos.");
  }
  const reais = Math.trunc(cents / 100);
  return `${reais},${String(cents % 100).padStart(2, "0")}`;
}

export function parseBRLToCents(value: string): number {
  const normalized = value
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(normalized)) {
    throw new Error("Informe um preço válido.");
  }
  const [wholePart, decimalPart = ""] = normalized.replace(/\./g, "").split(",");
  const cents = Number.parseInt(wholePart ?? "0", 10) * 100 +
    Number.parseInt(decimalPart.padEnd(2, "0") || "0", 10);
  if (!Number.isSafeInteger(cents) || cents > 999_999_999) {
    throw new Error("O preço informado é muito alto.");
  }
  return cents;
}
