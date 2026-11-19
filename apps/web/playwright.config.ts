import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: /.*\.unit\.spec\.ts/,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}` },
  // Tests run against a production build, which is what visitors get.
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
