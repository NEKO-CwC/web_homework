export type UserRole = "CUSTOMER" | "MERCHANT" | "ADMIN";

export type UserStatus = "ACTIVE" | "FROZEN";

export type MerchantApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type StoreStatus = "ACTIVE" | "FROZEN";

export type ProductStatus = "DRAFT" | "ACTIVE" | "OFF_SHELF" | "SOLD_OUT";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "AFTER_SALE";

export type AfterSaleStatus =
  | "REQUESTED"
  | "APPROVED"
  | "RETURNING"
  | "REFUNDED"
  | "REJECTED"
  | "CLOSED";

export type AfterSaleType = "REFUND" | "RETURN_REFUND" | "EXCHANGE";

export type BannerStatus = "ONLINE" | "OFFLINE";

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  categoryId: string;
  description: string;
  status: StoreStatus;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  sellingPoint: string;
  priceCents: number;
  stock: number;
  status: ProductStatus;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  parameters: Record<string, string>;
}

export interface CartLine {
  id: string;
  productId: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  storeId: string;
  priceCents: number;
  quantity: number;
  reviewed: boolean;
}

export interface ShipmentEvent {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  storeId: string;
  trackingNo: string;
  status: "CREATED" | "IN_TRANSIT" | "DELIVERED";
  events: ShipmentEvent[];
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  status: OrderStatus;
  totalAmountCents: number;
  addressSnapshot: string;
  items: OrderItem[];
  shipment?: Shipment;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface AfterSaleRequest {
  id: string;
  userId: string;
  orderItemId: string;
  type: AfterSaleType;
  reason: string;
  description: string;
  evidenceUrl?: string;
  status: AfterSaleStatus;
  merchantReply?: string;
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  status: BannerStatus;
  sortOrder: number;
}

export interface MerchantApplication {
  id: string;
  userId: string;
  storeName: string;
  categoryId: string;
  description: string;
  licenseImageUrl: string;
  status: MerchantApplicationStatus;
  reviewReason?: string;
  submittedAt: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  result: string;
  metadataSummary: string;
  ipAddress: string;
  createdAt: string;
}
