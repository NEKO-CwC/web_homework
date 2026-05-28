import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const seedPath = resolve(currentDir, "seed.ts");
const seedSource = readFileSync(seedPath, "utf8");
const publicRoot = resolve(currentDir, "../../../apps/storefront/public");

function publicAssetPaths() {
  return Array.from(seedSource.matchAll(/"\/(?:products|banners)\/[^"]+"/g), ([match]) => match.slice(1, -1));
}

describe("Prisma seed data", () => {
  it("references storefront public assets that exist", () => {
    for (const assetPath of publicAssetPaths()) {
      expect(existsSync(resolve(publicRoot, assetPath.slice(1))), `${assetPath} should exist`).toBe(true);
    }
  });

  it("contains enough review rows for the seed verifier and PRD demo data", () => {
    expect(seedSource.match(/prisma\.review\.create\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("keeps generated product images on stable ASCII asset paths", () => {
    expect(seedSource).not.toContain("encodeURIComponent(name)");
    expect(publicAssetPaths().filter((path) => path.startsWith("/products/")).length).toBeGreaterThanOrEqual(9);
  });
});
