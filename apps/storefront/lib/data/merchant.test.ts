import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveMerchantStore } from "./merchant";

const findFirst = vi.fn();

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn()
}));

vi.mock("@minimal-mall/db", () => ({
  prisma: {
    store: {
      findFirst
    }
  }
}));

describe("merchant data access", () => {
  const originalMode = process.env.MALL_WRITE_MODE;

  beforeEach(() => {
    process.env.MALL_WRITE_MODE = "prisma";
    findFirst.mockReset();
  });

  afterEach(() => {
    process.env.MALL_WRITE_MODE = originalMode;
  });

  it("does not fall back to another store when a Prisma merchant has no store", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getActiveMerchantStore("merchant-without-store")).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledWith({
      where: { ownerId: "merchant-without-store" },
      orderBy: { createdAt: "asc" }
    });
  });
});
