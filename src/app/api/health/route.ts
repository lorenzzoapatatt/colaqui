import { getPgPool } from "@/infrastructure/db/prisma";
import { getS3ObjectStorage } from "@/infrastructure/storage/s3-object-storage";
import { getServerEnv } from "@/lib/config/env";
import { getHealth, type HealthReport } from "@/modules/health/application/get-health";

export const dynamic = "force-dynamic";

const unavailable: HealthReport = {
  status: "degraded",
  components: { database: "error", storage: "error" },
};

export async function GET(): Promise<Response> {
  try {
    const env = getServerEnv();
    const database = getPgPool(env.databaseUrl);
    const storage = getS3ObjectStorage(env.s3);
    const report = await getHealth({
      database: async () => {
        await database.query("SELECT 1");
      },
      storage: async () => storage.check(),
    });

    return Response.json(report, { status: report.status === "ok" ? 200 : 503 });
  } catch {
    return Response.json(unavailable, { status: 503 });
  }
}
