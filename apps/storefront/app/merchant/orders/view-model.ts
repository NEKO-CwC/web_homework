import type { Order } from "@minimal-mall/types";

export function canCreateShipmentForOrder(order: Pick<Order, "status" | "shipment">) {
  return order.status === "TO_SHIP" && !order.shipment;
}
