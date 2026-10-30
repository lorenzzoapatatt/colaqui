import Link from "next/link";

import { CatalogSummary } from "@/components/dashboard/catalog-summary";
import { RecentProducts } from "@/components/dashboard/recent-products";
import { requirePageOwner } from "@/modules/auth/presentation/current-owner";
import { getCatalogDashboard } from "@/modules/dashboard/application/get-catalog-dashboard";

export default async function HomePage() {
  const owner = await requirePageOwner();
  const dashboard = await getCatalogDashboard();
  return (
    <main className="app-shell dashboard-shell">
      <nav className="app-nav" aria-label="Navegação principal">
        <Link className="app-logo" href="/">Colaqui</Link>
        <div>
          <Link href="/products">Produtos</Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Sair</button>
          </form>
        </div>
      </nav>
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Olá, {owner.email}</p>
          <h1>O que vamos vender hoje?</h1>
          <p>Organize seus objetos pessoais e prepare cada anúncio em um só lugar.</p>
        </div>
        <Link className="primary-action" href="/products/new">Cadastrar produto</Link>
      </header>
      <CatalogSummary counts={dashboard.counts} />
      <RecentProducts products={dashboard.recentProducts} />
    </main>
  );
}
