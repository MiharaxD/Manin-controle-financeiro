import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/offline",
  outputDir: "./test-results/offline",
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "iphone-layout",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
