import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveMerchantStore, getMerchantStats, listMerchantOrdersPage, merchantSalesCents } from "./merchant";

const storeFindFirst = vi.fn();
const orderFindMany = vi.fn();
const orderCount = vi.fn();
const afterSaleCount = vi.fn();

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn()
}));

vi.mock("@minimal-mall/db", () => ({
  prisma: {
    store: {
      findFirst: storeFindFirst
    },
    order: {
      findMany: orderFindMany,
      count: orderCount
    },
    afterSaleRequest: {
      count: afterSaleCount
    }
  }
}));

describe("merchant data access", () => {
  const originalMode = process.env.MALL_WRITE_MODE;

  beforeEach(() => {
    process.env.MALL_WRITE_MODE = "prisma";
    storeFindFirst.mockReset();
    orderFindMany.mockReset();
    orderCount.mockReset();
    afterSaleCount.mockReset();
  });

  afterEach(() => {
    process.env.MALL_WRITE_MODE = originalMode;
  });

  it("does not fall back to another store when a Prisma merchant has no store", async () => {
    storeFindFirst.mockResolvedValue(null);

    await expect(getActiveMerchantStore("merchant-without-store")).resolves.toBeUndefined();
    expect(storeFindFirst).toHaveBeenCalledWith({
      where: { ownerId: "merchant-without-store" },
      orderBy: { createdAt: "asc" }
    });
  });

  it("calculates sales from only the current store share of paid order totals", () => {
    expect(merchantSalesCents([
      {
        status: "TO_SHIP",
        totalAmountCents: 90000,
        items: [
          { storeId: "store-minimal", priceCents: 20000, quantity: 2 },
          { storeId: "store-home", priceCents: 60000, quantity: 1 }
        ]
      },
      {
        status: "PENDING_PAYMENT",
        totalAmountCents: 19900,
        items: [
          { storeId: "store-minimal", priceCents: 19900, quantity: 1 }
        ]
      },
      {
        status: "SHIPPED",
        totalAmountCents: 11900,
        items: [
          { storeId: "store-minimal", priceCents: 15900, quantity: 1 }
        ]
      }
    ], "store-minimal")).toBe(47900);
  });

  it("returns Prisma merchant orders with real customer display names", async () => {
    orderCount.mockResolvedValue(1);
    orderFindMany.mockResolvedValue([
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
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
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

  it("builds Prisma merchant stats from current store pending after-sales and monthly revenue orders", async () => {
    orderCount.mockResolvedValue(2);
    afterSaleCount.mockResolvedValue(1);
    orderFindMany.mockResolvedValue([
      {
        status: "TO_SHIP",
        totalAmountCents: 10000,
        items: [
          { storeId: "store-minimal", priceCents: 6000, quantity: 1 },
          { storeId: "store-home", priceCents: 4000, quantity: 1 }
        ]
      },
      {
        status: "DELIVERED",
        totalAmountCents: 5000,
        items: [
          { storeId: "store-minimal", priceCents: 5000, quantity: 1 }
        ]
      }
    ]);

    await expect(getMerchantStats("store-minimal")).resolves.toEqual({
      toShipCount: 2,
      afterSaleCount: 1,
      monthSalesCents: 11000
    });
    expect(orderCount).toHaveBeenCalledWith({
      where: {
        status: "TO_SHIP",
        items: { some: { storeId: "store-minimal" } }
      }
    });
    expect(afterSaleCount).toHaveBeenCalledWith({
      where: {
        status: "REQUESTED",
        orderItem: { storeId: "store-minimal" }
      }
    });
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { in: ["PAID", "TO_SHIP", "SHIPPED", "DELIVERED", "COMPLETED", "AFTER_SALE"] },
        createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        items: { some: { storeId: "store-minimal" } }
      }),
      include: { items: true }
    }));
  });
});
