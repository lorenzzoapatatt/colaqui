import { defineConfig, devices } from "@playwright/test";

const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://colaqui:colaqui_dev@localhost:55432/colaqui_e2e";
const port = 3002;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: process.env.COLAQUI_E2E_BASE_URL ?? `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      NODE_ENV: "development",
      S3_BUCKET: "colaqui-e2e",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
