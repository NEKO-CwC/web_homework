import { isProductPurchasable } from "@minimal-mall/auth";
import {
  getDemoCustomerProfile,
  getDemoOrderProduct,
  getDemoProduct,
  getDemoStore,
  listDemoCartLines,
  listDemoAfterSales,
  listDemoOrders
} from "../demo-state";
import {
  getPrismaClient,
  isPrismaDataMode,
  mapAfterSale,
  mapOrder,
  mapOrderItem,
  mapProduct
} from "./db";

const CURRENT_CUSTOMER_ID = "user-customer-1";

export async function getCurrentCustomerProfile(userId = CURRENT_CUSTOMER_ID) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const profile = await db.customerProfile.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!profile) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true }
      });
      return {
        id: userId,
        nickname: "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        defaultAddress: ""
      };
    }
    return {
      id: profile.userId,
      nickname: profile.nickname,
      email: profile.user.email ?? "",
      phone: profile.contactPhone,
      defaultAddress: profile.defaultAddress
    };
  }
  return getDemoCustomerProfile(userId);
}

export async function listCartItems(userId = CURRENT_CUSTOMER_ID) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            reviews: true
          }
        }
      }
    });
    return rows.map((line) => ({
      id: line.id,
      productId: line.productId,
      quantity: line.quantity,
      product: mapProduct(line.product)
    }));
  }
  return listDemoCartLines(userId)
    .map((line) => {
      const product = getDemoProduct(line.productId);
      return product ? { ...line, product } : null;
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));
}

export async function getDirectCheckoutLine(productId: string, quantity = 1) {
  const safeQuantity = Math.max(1, Math.trunc(quantity));
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
        images: true,
        reviews: true
      }
    });
    if (!product) return null;
    if (!isProductPurchasable({
      status: product.status,
      stock: product.stock,
      storeStatus: product.store.status
    }) || safeQuantity > product.stock) {
      return null;
    }
    return {
      id: `direct-${product.id}`,
      productId: product.id,
      quantity: safeQuantity,
      product: mapProduct(product)
    };
  }

  const product = getDemoProduct(productId);
  const store = product ? getDemoStore(product.storeId) : undefined;
  if (!product || !isProductPurchasable({
    status: product.status,
    stock: product.stock,
    storeStatus: store?.status ?? "FROZEN"
  }) || safeQuantity > product.stock) {
    return null;
  }
  return {
    id: `direct-${product.id}`,
    productId: product.id,
    quantity: safeQuantity,
    product
  };
}

export async function listCustomerOrders(userId = CURRENT_CUSTOMER_ID) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.order.findMany({
      where: { userId },
      include: {
        items: {
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
          include: { events: { orderBy: { occurredAt: "asc" } } },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => ({
      ...mapOrder(row),
      primaryProduct: row.items[0] ? mapProduct(row.items[0].product) : undefined,
      itemsWithProducts: row.items.map((item) => ({
        ...mapOrderItem(item),
        product: mapProduct(item.product)
      }))
    }));
  }
  return listDemoOrders(userId).map((order) => ({
    ...order,
    primaryProduct: getDemoOrderProduct(order),
    itemsWithProducts: order.items.map((item) => ({
      ...item,
      product: getDemoProduct(item.productId)
    }))
  }));
}

export async function listAfterSales(userId = CURRENT_CUSTOMER_ID) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.afterSaleRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapAfterSale);
  }
  return listDemoAfterSales(userId);
}
