import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CatalogCounts,
  CatalogDashboard,
  DashboardRepository,
} from "@/modules/dashboard/application/dashboard-repository";
import { toProductView } from "@/modules/products/infrastructure/prisma-product-repository";

const emptyCounts = (): CatalogCounts => ({
  DRAFT: 0,
  READY: 0,
  LISTED: 0,
  RESERVED: 0,
  SOLD: 0,
});

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCatalogDashboard(): Promise<CatalogDashboard> {
    const [groups, recentProducts] = await Promise.all([
      this.prisma.product.groupBy({
        by: ["status"],
        where: { archivedAt: null, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.product.findMany({
        where: { archivedAt: null, deletedAt: null },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
    ]);
    const counts = emptyCounts();
    for (const group of groups) {
      if (group.status in counts) {
        counts[group.status as keyof CatalogCounts] = group._count._all;
      }
    }
    return {
      counts,
      recentProducts: recentProducts.map(toProductView),
    };
  }
}
