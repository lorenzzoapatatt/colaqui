export type ComponentHealth = "ok" | "error";

export interface HealthDependencies {
  database: () => Promise<void>;
  storage: () => Promise<void>;
}

export interface HealthReport {
  status: "ok" | "degraded";
  components: {
    database: ComponentHealth;
    storage: ComponentHealth;
  };
}

async function probe(check: () => Promise<void>): Promise<ComponentHealth> {
  try {
    await check();
    return "ok";
  } catch {
    return "error";
  }
}

export async function getHealth(deps: HealthDependencies): Promise<HealthReport> {
  const [database, storage] = await Promise.all([probe(deps.database), probe(deps.storage)]);

  return {
    status: database === "ok" && storage === "ok" ? "ok" : "degraded",
    components: { database, storage },
  };
}
