import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveMerchantStore, merchantSalesCents } from "./merchant";

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

  it("calculates sales from only the current store share of paid order totals", () => {
    expect(merchantSalesCents([
      {
        totalAmountCents: 90000,
        items: [
          { storeId: "store-minimal", priceCents: 20000, quantity: 2 },
          { storeId: "store-home", priceCents: 60000, quantity: 1 }
        ]
      },
      {
        totalAmountCents: 11900,
        items: [
          { storeId: "store-minimal", priceCents: 15900, quantity: 1 }
        ]
      }
    ], "store-minimal")).toBe(47900);
  });
});
