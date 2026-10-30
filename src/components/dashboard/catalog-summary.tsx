import type { CatalogCounts } from "@/modules/dashboard/application/dashboard-repository";

const summaries = [
  ["DRAFT", "Rascunhos"],
  ["READY", "Prontos"],
  ["LISTED", "Anunciados"],
  ["RESERVED", "Reservados"],
  ["SOLD", "Vendidos"],
] as const;

export function CatalogSummary({ counts }: { counts: CatalogCounts }) {
  return (
    <section aria-labelledby="catalog-summary-title">
      <h2 id="catalog-summary-title" className="section-title">Visão do catálogo</h2>
      <ul className="summary-grid">
        {summaries.map(([status, label]) => (
          <li key={status}>
            <strong>{counts[status]}</strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
