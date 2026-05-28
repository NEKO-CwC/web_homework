import type {
  AfterSaleStatus,
  AfterSaleType,
  OrderStatus,
  ProductStatus
} from "@minimal-mall/types";

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function formatOrderStatus(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "待支付",
    PAID: "已支付",
    TO_SHIP: "待发货",
    SHIPPED: "运输中",
    DELIVERED: "已收货",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
    AFTER_SALE: "售后中"
  };
  return labels[status];
}

export function formatProductStatus(status: ProductStatus) {
  const labels: Record<ProductStatus, string> = {
    DRAFT: "草稿",
    ACTIVE: "销售中",
    OFF_SHELF: "已下架",
    SOLD_OUT: "缺货"
  };
  return labels[status];
}

export function formatAfterSaleStatus(status: AfterSaleStatus) {
  const labels: Record<AfterSaleStatus, string> = {
    REQUESTED: "待处理",
    APPROVED: "已通过",
    RETURNING: "退回中",
    REFUNDED: "已退款",
    REJECTED: "已驳回",
    CLOSED: "已关闭"
  };
  return labels[status];
}

export function formatAfterSaleType(type: AfterSaleType) {
  const labels: Record<AfterSaleType, string> = {
    REFUND: "仅退款",
    RETURN_REFUND: "退货退款",
    EXCHANGE: "换货"
  };
  return labels[type];
}

export function badgeToneForOrder(status: OrderStatus) {
  if (status === "TO_SHIP" || status === "SHIPPED") return "accent";
  if (status === "DELIVERED" || status === "COMPLETED") return "success";
  if (status === "AFTER_SALE" || status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED") return "danger";
  return "muted";
}

export function makeVirtualTrackingNo(seed: string) {
  const chars = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const first = String(1000 + (chars % 9000)).padStart(4, "0");
  const second = String(1000 + ((chars * 17) % 9000)).padStart(4, "0");
  return `VL-${first}-${second}`;
}
