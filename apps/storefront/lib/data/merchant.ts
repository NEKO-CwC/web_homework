import type { AfterSaleStatus, OrderStatus } from "@minimal-mall/types";
import { stores } from "../fixtures";
import {
  findDemoCustomerProfileById,
  getDemoOrderProduct,
  listDemoAfterSales,
  listDemoOrders,
  listDemoStores
} from "../demo-state";
import {
  getPrismaClient,
  isPrismaDataMode,
  mapAfterSale,
  mapOrder,
  mapProduct,
  mapStore
} from "./db";
import { normalizePagination, paginateArray, type PaginationInput } from "./pagination";

const ACTIVE_MERCHANT_ID = "merchant-1";
const REVENUE_ORDER_STATUSES: OrderStatus[] = ["PAID", "TO_SHIP", "SHIPPED", "DELIVERED", "COMPLETED", "AFTER_SALE"];

function formatCustomerName(order: {
  userId: string;
  user?: {
    email?: string | null;
    phone?: string | null;
    customerProfile?: { nickname?: string | null } | null;
  } | null;
}) {
  return order.user?.customerProfile?.nickname ?? order.user?.email ?? order.user?.phone ?? order.userId;
}

function demoCustomerName(userId: string) {
  const profile = findDemoCustomerProfileById(userId);
  return profile?.nickname ?? userId;
}

function startOfCurrentMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isCurrentMonthOrder(orderNo: string, now = new Date()) {
  const match = /^MO(\d{4})(\d{2})/.exec(orderNo);
  if (!match) return true;
  const [, year, month] = match;
  return Number(year) === now.getFullYear() && Number(month) === now.getMonth() + 1;
}

export async function getActiveMerchantStore(ownerId = ACTIVE_MERCHANT_ID) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const store = await db.store.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "asc" }
    });
    return store ? mapStore(store) : undefined;
  }
  return listDemoStores().find((store) => store.ownerId === ownerId) ?? stores[0];
}

export async function listMerchantOrders(storeId: string) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.order.findMany({
      where: {
        items: {
          some: { storeId }
        }
      },
      include: {
        user: {
          include: { customerProfile: true }
        },
        items: {
          where: { storeId },
          include: {
            review: true,
            product: {
              include: {
                images: true,
                reviews: true
              }
            }
          }
        },
        shipments: {
          where: { storeId },
          include: { events: { orderBy: { occurredAt: "asc" } } },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      ...mapOrder(row),
      customerName: formatCustomerName(row),
      primaryProduct: row.items[0] ? mapProduct(row.items[0].product) : undefined
    }));
  }
  return listDemoOrders()
    .filter((order) => order.items.some((item) => item.storeId === storeId))
    .map((order) => ({
      ...order,
      customerName: demoCustomerName(order.userId),
      primaryProduct: getDemoOrderProduct(order)
    }));
}

export interface MerchantOrderFilters extends PaginationInput {
  status?: OrderStatus | "";
}

export async function listMerchantOrdersPage(storeId: string, filters: MerchantOrderFilters = {}) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const { page, pageSize, skip } = normalizePagination(filters);
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      items: {
        some: { storeId }
      }
    };
    const [rows, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          user: {
            include: { customerProfile: true }
          },
          items: {
            where: { storeId },
            include: {
              review: true,
              product: {
                include: {
                  images: true,
                  reviews: true
                }
              }
            }
          },
          shipments: {
            where: { storeId },
            include: { events: { orderBy: { occurredAt: "asc" } } },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      db.order.count({ where })
    ]);
    return {
      items: rows.map((row) => ({
        ...mapOrder(row),
        customerName: formatCustomerName(row),
        primaryProduct: row.items[0] ? mapProduct(row.items[0].product) : undefined
      })),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize))
    };
  }
  const filtered = listDemoOrders()
    .filter((order) => order.items.some((item) => item.storeId === storeId))
    .filter((order) => !filters.status || order.status === filters.status)
    .map((order) => ({
      ...order,
      customerName: demoCustomerName(order.userId),
      primaryProduct: getDemoOrderProduct(order)
    }));
  return paginateArray(filtered, filters);
}

export async function listMerchantAfterSales(storeId = stores[0].id) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.afterSaleRequest.findMany({
      where: {
        orderItem: { storeId }
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapAfterSale);
  }
  return listDemoAfterSales().filter((item) =>
    listDemoOrders().some((order) =>
      order.items.some((orderItem) => orderItem.id === item.orderItemId && orderItem.storeId === storeId)
    )
  );
}

export interface MerchantAfterSaleFilters extends PaginationInput {
  status?: AfterSaleStatus | "";
}

export async function listMerchantAfterSalesPage(storeId = stores[0].id, filters: MerchantAfterSaleFilters = {}) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const { page, pageSize, skip } = normalizePagination(filters);
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      orderItem: { storeId }
    };
    const [rows, total] = await Promise.all([
      db.afterSaleRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      db.afterSaleRequest.count({ where })
    ]);
    return {
      items: rows.map(mapAfterSale),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize))
    };
  }
  const filtered = listDemoAfterSales().filter((item) =>
    (!filters.status || item.status === filters.status) &&
    listDemoOrders().some((order) =>
      order.items.some((orderItem) => orderItem.id === item.orderItemId && orderItem.storeId === storeId)
    )
  );
  return paginateArray(filtered, filters);
}

export async function getMerchantStats(storeId: string) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const [toShipCount, afterSaleCount, revenueOrders] = await Promise.all([
      db.order.count({
        where: {
          status: "TO_SHIP",
          items: { some: { storeId } }
        }
      }),
      db.afterSaleRequest.count({
        where: {
          status: "REQUESTED",
          orderItem: { storeId }
        }
      }),
      db.order.findMany({
        where: {
          status: { in: REVENUE_ORDER_STATUSES },
          createdAt: { gte: startOfCurrentMonth() },
          items: { some: { storeId } }
        },
        include: { items: true }
      })
    ]);
    return {
      toShipCount,
      afterSaleCount,
      monthSalesCents: merchantSalesCents(revenueOrders, storeId)
    };
  }

  const merchantOrders = await listMerchantOrders(storeId);
  const merchantAfterSales = await listMerchantAfterSales(storeId);
  const revenueOrders = merchantOrders.filter((order) => isCurrentMonthOrder(order.orderNo));
  return {
    toShipCount: merchantOrders.filter((order) => order.status === "TO_SHIP").length,
    afterSaleCount: merchantAfterSales.filter((item) => item.status === "REQUESTED").length,
    monthSalesCents: merchantSalesCents(revenueOrders, storeId)
  };
}

export function merchantSalesCents(
  orders: Array<{
    status: OrderStatus;
    totalAmountCents: number;
    items: Array<{ storeId: string; priceCents: number; quantity: number }>;
  }>,
  storeId: string
) {
  return orders.reduce((sum, order) => {
    if (!REVENUE_ORDER_STATUSES.includes(order.status)) return sum;
    const orderItemTotal = order.items.reduce(
      (itemSum, item) => itemSum + item.priceCents * item.quantity,
      0
    );
    const storeItemTotal = order.items
      .filter((item) => item.storeId === storeId)
      .reduce((itemSum, item) => itemSum + item.priceCents * item.quantity, 0);
    if (orderItemTotal <= 0 || storeItemTotal <= 0) return sum;
    return sum + Math.round(order.totalAmountCents * (storeItemTotal / orderItemTotal));
  }, 0);
}
