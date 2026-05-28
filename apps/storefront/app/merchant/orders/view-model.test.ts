import { describe, expect, it } from "vitest";
import { canCreateShipmentForOrder } from "./view-model";

describe("merchant order view model", () => {
  it("shows shipment creation only for unshipped to-ship store orders", () => {
    expect(canCreateShipmentForOrder({ status: "TO_SHIP", shipment: undefined })).toBe(true);
    expect(canCreateShipmentForOrder({
      status: "TO_SHIP",
      shipment: {
        id: "ship-1",
        orderId: "order-1",
        storeId: "store-minimal",
        trackingNo: "VL-1234-5678",
        status: "IN_TRANSIT",
        events: []
      }
    })).toBe(false);
    expect(canCreateShipmentForOrder({ status: "SHIPPED", shipment: undefined })).toBe(false);
  });
});
