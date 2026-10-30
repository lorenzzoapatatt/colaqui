import { getPrisma } from "@/infrastructure/db/prisma";
import type {
  CatalogDashboard,
  DashboardRepository,
} from "@/modules/dashboard/application/dashboard-repository";
import { PrismaDashboardRepository } from "@/modules/dashboard/infrastructure/prisma-dashboard-repository";

export async function getCatalogDashboard(
  repository: DashboardRepository = new PrismaDashboardRepository(getPrisma()),
): Promise<CatalogDashboard> {
  return repository.getCatalogDashboard();
}
