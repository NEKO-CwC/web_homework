import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "../../coverage/storefront",
      reporter: ["text", "json-summary"],
      include: [
        "lib/data/admin.ts",
        "lib/fixtures.ts",
        "lib/format.ts",
        "lib/services/mall-service.ts",
        "lib/upload.ts"
      ],
      exclude: [
        "lib/**/*.test.ts",
        "lib/actions.ts"
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
