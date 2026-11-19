import { defineConfig } from "@playwright/test";

// Pure-function tests: no browser and no web server, so they run in under a second.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.unit\.spec\.ts/,
  reporter: [["list"]],
});
