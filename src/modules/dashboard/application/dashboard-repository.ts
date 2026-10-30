import type { ProductView } from "@/modules/products/application/product-repository";

export interface CatalogCounts {
  DRAFT: number;
  READY: number;
  LISTED: number;
  RESERVED: number;
  SOLD: number;
}

export interface CatalogDashboard {
  counts: CatalogCounts;
  recentProducts: ProductView[];
}

export interface DashboardRepository {
  getCatalogDashboard(): Promise<CatalogDashboard>;
}
