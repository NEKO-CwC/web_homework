import type {
  AfterSaleRequest,
  AuditLog,
  Category,
  HomeBanner,
  Order,
  OrderItem,
  Product,
  Review,
  Shipment,
  Store,
  SystemSetting,
  UserRole
} from "@minimal-mall/types";
import { unstable_noStore as noStore } from "next/cache";

type PrismaClientLike = typeof import("@minimal-mall/db")["prisma"];

let defaultPrismaClient: Promise<PrismaClientLike> | undefined;

export function isPrismaDataMode() {
  const enabled = process.env.MALL_WRITE_MODE === "prisma";
  if (enabled) noStore();
  return enabled;
}

export async function getPrismaClient() {
  defaultPrismaClient ??= import("@minimal-mall/db").then(({ prisma }) => prisma);
  return defaultPrismaClient;
}

export function mapProduct(row: {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  status: Product["status"];
  images?: { url: string; sortOrder: number }[];
  reviews?: { rating: number }[];
}): Product {
  const image = row.images?.sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const reviews = row.reviews ?? [];
  const rating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return {
    id: row.id,
    storeId: row.storeId,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    sellingPoint: row.description,
    priceCents: row.priceCents,
    stock: row.stock,
    status: row.status,
    imageUrl: image?.url ?? "/products/placeholder.jpg",
    rating: Number(rating.toFixed(1)),
    reviewCount: reviews.length,
    parameters: {
      发货: "24 小时内虚拟发货",
      售后: "7 天无理由退换",
      库存: `${row.stock} 件`
    }
  };
}

export function mapStore(row: Store): Store {
  return {
    id: row.id,
    ownerId: row.ownerId,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    status: row.status
  };
}

export function mapCategory(row: Category): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    enabled: row.enabled
  };
}

export function mapReview(row: {
  id: string;
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  content: string;
  createdAt: Date | string;
}): Review {
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    orderItemId: row.orderItemId,
    rating: row.rating,
    content: row.content,
    createdAt: formatDate(row.createdAt)
  };
}

export function mapOrderItem(row: {
  id: string;
  productId: string;
  storeId: string;
  priceCents: number;
  quantity: number;
  review?: unknown | null;
}): OrderItem {
  return {
    id: row.id,
    productId: row.productId,
    storeId: row.storeId,
    priceCents: row.priceCents,
    quantity: row.quantity,
    reviewed: Boolean(row.review)
  };
}

export function mapShipment(row: {
  id: string;
  orderId: string;
  storeId: string;
  trackingNo: string;
  status: Shipment["status"];
  events?: {
    id: string;
    title: string;
    description: string;
    occurredAt: Date | string;
  }[];
}): Shipment {
  return {
    id: row.id,
    orderId: row.orderId,
    storeId: row.storeId,
    trackingNo: row.trackingNo,
    status: row.status,
    events: (row.events ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      occurredAt: formatDateTime(event.occurredAt)
    }))
  };
}

export function mapOrder(row: {
  id: string;
  orderNo: string;
  userId: string;
  status: Order["status"];
  totalAmountCents: number;
  addressSnapshot: string;
  items: Parameters<typeof mapOrderItem>[0][];
  shipments?: Parameters<typeof mapShipment>[0][];
}): Order {
  return {
    id: row.id,
    orderNo: row.orderNo,
    userId: row.userId,
    status: row.status,
    totalAmountCents: row.totalAmountCents,
    addressSnapshot: row.addressSnapshot,
    items: row.items.map(mapOrderItem),
    shipment: row.shipments?.[0] ? mapShipment(row.shipments[0]) : undefined
  };
}

export function mapAfterSale(row: {
  id: string;
  userId: string;
  orderItemId: string;
  type: AfterSaleRequest["type"];
  reason: string;
  description: string;
  evidenceUrl?: string | null;
  status: AfterSaleRequest["status"];
  merchantReply?: string | null;
}): AfterSaleRequest {
  return {
    id: row.id,
    userId: row.userId,
    orderItemId: row.orderItemId,
    type: row.type,
    reason: row.reason,
    description: row.description,
    evidenceUrl: row.evidenceUrl ?? undefined,
    status: row.status,
    merchantReply: row.merchantReply ?? undefined
  };
}

export function mapBanner(row: HomeBanner): HomeBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    status: row.status,
    sortOrder: row.sortOrder
  };
}

export function mapSetting(row: SystemSetting): SystemSetting {
  return {
    key: row.key,
    value: row.value,
    description: row.description
  };
}

export function mapAuditLog(row: {
  id: string;
  actor?: { email: string | null; phone: string | null; role: UserRole } | null;
  action: string;
  targetType: string;
  targetId: string;
  result: string;
  createdAt: Date | string;
}): AuditLog {
  return {
    id: row.id,
    actorName: row.actor?.email ?? row.actor?.phone ?? "系统",
    actorRole: row.actor?.role ?? "ADMIN",
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    result: row.result,
    createdAt: formatDateTime(row.createdAt)
  };
}

function formatDate(value: Date | string) {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value: Date | string) {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 16).replace("T", " ");
}
