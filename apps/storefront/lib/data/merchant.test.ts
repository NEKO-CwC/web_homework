import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveMerchantStore, listMerchantOrdersPage, merchantSalesCents } from "./merchant";

const findFirst = vi.fn();
const findMany = vi.fn();
const count = vi.fn();

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn()
}));

vi.mock("@minimal-mall/db", () => ({
  prisma: {
    store: {
      findFirst
    },
    order: {
      findMany,
      count
    }
  }
}));

describe("merchant data access", () => {
  const originalMode = process.env.MALL_WRITE_MODE;

  beforeEach(() => {
    process.env.MALL_WRITE_MODE = "prisma";
    findFirst.mockReset();
    findMany.mockReset();
    count.mockReset();
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

  it("returns Prisma merchant orders with real customer display names", async () => {
    count.mockResolvedValue(1);
    findMany.mockResolvedValue([
      {
        id: "order-real-customer",
        orderNo: "MO20260529001",
        userId: "user-real-customer",
        status: "TO_SHIP",
        totalAmountCents: 12900,
        addressSnapshot: "江西省南昌市红谷滩区真实订单路 1 号",
        user: {
          email: "real-customer@example.com",
          phone: "13800009999",
          customerProfile: { nickname: "真实顾客" }
        },
        items: [
          {
            id: "item-real-customer",
            productId: "prod-real-customer",
            storeId: "store-minimal",
            priceCents: 12900,
            quantity: 1,
            review: null,
            product: {
              id: "prod-real-customer",
              storeId: "store-minimal",
              categoryId: "cat-digital",
              name: "真实订单商品",
              description: "真实顾客订单商品描述",
              priceCents: 12900,
              stock: 9,
              status: "ACTIVE",
              images: [{ url: "/products/lamp.jpg", sortOrder: 0 }],
              reviews: []
            }
          }
        ],
        shipments: []
      }
    ]);

    await expect(listMerchantOrdersPage("store-minimal")).resolves.toMatchObject({
      items: [
        {
          orderNo: "MO20260529001",
          customerName: "真实顾客"
        }
      ],
      total: 1
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        user: { include: { customerProfile: true } }
      })
    }));
  });

  it("returns demo merchant orders with seeded customer display names", async () => {
    process.env.MALL_WRITE_MODE = "demo";

    await expect(listMerchantOrdersPage("store-home", { pageSize: 5 })).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          orderNo: "MO20260525016",
          customerName: "陈舟"
        })
      ])
    });
  });
});
