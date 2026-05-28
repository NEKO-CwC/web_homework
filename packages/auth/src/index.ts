import { timingSafeEqual, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import type {
  AfterSaleStatus,
  MerchantApplicationStatus,
  OrderStatus,
  ProductStatus,
  StoreStatus,
  UserRole
} from "@minimal-mall/types";

const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;
const passwordHashPrefix = "scrypt";

export interface SessionUser {
  id: string;
  role: UserRole;
  storeIds?: string[];
}

export type ProtectedArea = "customer" | "merchant" | "admin";

export interface AuthenticatedUser extends SessionUser {
  email?: string | null;
  phone?: string | null;
  status?: "ACTIVE" | "FROZEN";
}

const areaRoles: Record<ProtectedArea, UserRole[]> = {
  customer: ["CUSTOMER", "MERCHANT", "ADMIN"],
  merchant: ["MERCHANT", "ADMIN"],
  admin: ["ADMIN"]
};

export function canAccessArea(user: SessionUser | null, area: ProtectedArea) {
  if (!user) return false;
  return areaRoles[area].includes(user.role);
}

export function assertAreaAccess(user: SessionUser | null, area: ProtectedArea) {
  if (canAccessArea(user, area)) return;
  throw new Error(area === "customer" ? "请先登录后再访问该页面" : "当前账号无权访问该工作台");
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derivedKey = await scrypt(password, salt, passwordKeyLength);
  return `${passwordHashPrefix}:${salt}:${Buffer.from(derivedKey as Buffer).toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(":");
  if (prefix !== passwordHashPrefix || !salt || !hash) return false;
  const derivedKey = await scrypt(password, salt, passwordKeyLength);
  const stored = Buffer.from(hash, "hex");
  const computed = Buffer.from(derivedKey as Buffer);
  if (stored.length !== computed.length) return false;
  return timingSafeEqual(stored, computed);
}

export function canManageStore(user: SessionUser | null, storeOwnerId: string) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "MERCHANT") return false;
  return user.id === storeOwnerId || Boolean(user.storeIds?.includes(storeOwnerId));
}

export function canEditProduct(user: SessionUser | null, productStoreId: string) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "MERCHANT" && Boolean(user.storeIds?.includes(productStoreId));
}

export function isProductPurchasable(product: {
  status: ProductStatus;
  stock: number;
  storeStatus: StoreStatus;
}) {
  return product.status === "ACTIVE" && product.stock > 0 && product.storeStatus === "ACTIVE";
}

export function canConfirmReceive(status: OrderStatus) {
  return status === "SHIPPED";
}

export function canReviewOrderItem(orderStatus: OrderStatus, reviewed: boolean) {
  return orderStatus === "DELIVERED" && !reviewed;
}

export function canCreateAfterSale(status: OrderStatus) {
  return ["PAID", "TO_SHIP", "SHIPPED", "DELIVERED"].includes(status);
}

export function canCreateShipment(status: OrderStatus, existingTrackingNo?: string | null) {
  return status === "TO_SHIP" && !existingTrackingNo;
}

export function nextOrderStatusAfterPayment(success: boolean): OrderStatus {
  return success ? "TO_SHIP" : "PENDING_PAYMENT";
}

export function nextOrderStatusAfterShipment(status: OrderStatus): OrderStatus {
  if (status !== "TO_SHIP") {
    throw new Error("只有待发货订单可以生成虚拟运单");
  }
  return "SHIPPED";
}

export function nextOrderStatusAfterReceive(status: OrderStatus): OrderStatus {
  if (!canConfirmReceive(status)) {
    throw new Error("只有运输中订单可以确认收货");
  }
  return "DELIVERED";
}

export function nextAfterSaleStatus(
  status: AfterSaleStatus,
  action: "approve" | "reject" | "return" | "refund" | "close"
): AfterSaleStatus {
  if (status === "REQUESTED" && action === "approve") return "APPROVED";
  if (status === "REQUESTED" && action === "reject") return "REJECTED";
  if (status === "APPROVED" && action === "return") return "RETURNING";
  if (status === "RETURNING" && action === "refund") return "REFUNDED";
  if ((status === "REJECTED" || status === "REFUNDED") && action === "close") return "CLOSED";
  throw new Error("售后状态流转不合法");
}

export function nextMerchantApplicationStatus(
  status: MerchantApplicationStatus,
  action: "submit" | "approve" | "reject"
): MerchantApplicationStatus {
  if (status === "DRAFT" && action === "submit") return "SUBMITTED";
  if (status === "SUBMITTED" && action === "approve") return "APPROVED";
  if (status === "SUBMITTED" && action === "reject") return "REJECTED";
  throw new Error("商家申请状态流转不合法");
}
