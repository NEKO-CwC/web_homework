import { describe, expect, it } from "vitest";
import {
  canAccessArea,
  canConfirmReceive,
  canCreateAfterSale,
  canCreateShipment,
  canReviewOrderItem,
  hashPassword,
  isProductPurchasable,
  nextAfterSaleStatus,
  nextMerchantApplicationStatus,
  nextOrderStatusAfterPayment,
  nextOrderStatusAfterReceive,
  nextOrderStatusAfterShipment,
  verifyPassword
} from "./index";

describe("authorization rules", () => {
  it("protects customer, merchant, and admin areas by role", () => {
    expect(canAccessArea(null, "customer")).toBe(false);
    expect(canAccessArea({ id: "u1", role: "CUSTOMER" }, "customer")).toBe(true);
    expect(canAccessArea({ id: "u1", role: "CUSTOMER" }, "merchant")).toBe(false);
    expect(canAccessArea({ id: "u2", role: "MERCHANT" }, "merchant")).toBe(true);
    expect(canAccessArea({ id: "u3", role: "ADMIN" }, "admin")).toBe(true);
  });
});

describe("password hashing", () => {
  it("stores salted scrypt hashes and verifies passwords", async () => {
    const hash = await hashPassword("12345678", "fixed-salt");
    expect(hash).toMatch(/^scrypt:fixed-salt:/);
    expect(hash).not.toContain("12345678");
    await expect(verifyPassword("12345678", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", hash)).resolves.toBe(false);
    await expect(verifyPassword("12345678", "$2b$10$seeded-password-hash")).resolves.toBe(false);
  });
});

describe("commerce rules", () => {
  it("filters purchasable products", () => {
    expect(isProductPurchasable({ status: "ACTIVE", stock: 1, storeStatus: "ACTIVE" })).toBe(true);
    expect(isProductPurchasable({ status: "ACTIVE", stock: 0, storeStatus: "ACTIVE" })).toBe(false);
    expect(isProductPurchasable({ status: "OFF_SHELF", stock: 5, storeStatus: "ACTIVE" })).toBe(false);
    expect(isProductPurchasable({ status: "ACTIVE", stock: 5, storeStatus: "FROZEN" })).toBe(false);
  });

  it("enforces order action availability", () => {
    expect(canConfirmReceive("SHIPPED")).toBe(true);
    expect(canReviewOrderItem("DELIVERED", false)).toBe(true);
    expect(canReviewOrderItem("DELIVERED", true)).toBe(false);
    expect(canCreateAfterSale("TO_SHIP")).toBe(true);
    expect(canCreateShipment("TO_SHIP")).toBe(true);
    expect(canCreateShipment("TO_SHIP", "VL-0001-0002")).toBe(false);
  });
});

describe("state transitions", () => {
  it("moves payment, shipment, and receipt states", () => {
    expect(nextOrderStatusAfterPayment(true)).toBe("TO_SHIP");
    expect(nextOrderStatusAfterPayment(false)).toBe("PENDING_PAYMENT");
    expect(nextOrderStatusAfterShipment("TO_SHIP")).toBe("SHIPPED");
    expect(nextOrderStatusAfterReceive("SHIPPED")).toBe("DELIVERED");
    expect(() => nextOrderStatusAfterShipment("SHIPPED")).toThrow("只有待发货订单");
  });

  it("moves after-sale states with validation", () => {
    expect(nextAfterSaleStatus("REQUESTED", "approve")).toBe("APPROVED");
    expect(nextAfterSaleStatus("REQUESTED", "reject")).toBe("REJECTED");
    expect(nextAfterSaleStatus("APPROVED", "return")).toBe("RETURNING");
    expect(nextAfterSaleStatus("RETURNING", "refund")).toBe("REFUNDED");
    expect(nextAfterSaleStatus("REFUNDED", "close")).toBe("CLOSED");
    expect(() => nextAfterSaleStatus("REQUESTED", "refund")).toThrow("售后状态流转不合法");
  });

  it("moves merchant application states with validation", () => {
    expect(nextMerchantApplicationStatus("DRAFT", "submit")).toBe("SUBMITTED");
    expect(nextMerchantApplicationStatus("SUBMITTED", "approve")).toBe("APPROVED");
    expect(nextMerchantApplicationStatus("SUBMITTED", "reject")).toBe("REJECTED");
    expect(() => nextMerchantApplicationStatus("APPROVED", "reject")).toThrow("商家申请状态流转不合法");
  });
});
