import { describe, expect, it } from "vitest";
import {
  badgeToneForOrder,
  checkoutDiscountCents,
  checkoutTotalCents,
  formatAfterSaleStatus,
  formatAfterSaleType,
  formatMoney,
  formatOrderStatus,
  formatProductStatus,
  makeVirtualTrackingNo,
  visibleReviewCount
} from "./format";

describe("format helpers", () => {
  it("formats integer cents as Chinese yuan", () => {
    expect(formatMoney(32900)).toBe("¥329");
    expect(formatMoney(0)).toBe("¥0");
  });

  it("calculates checkout discount and payable total consistently", () => {
    expect(checkoutDiscountCents(30000)).toBe(0);
    expect(checkoutDiscountCents(30001)).toBe(4000);
    expect(checkoutTotalCents(65800)).toBe(61800);
  });

  it("formats business status labels", () => {
    expect(formatOrderStatus("TO_SHIP")).toBe("待发货");
    expect(formatOrderStatus("SHIPPED")).toBe("运输中");
    expect(formatProductStatus("SOLD_OUT")).toBe("缺货");
    expect(formatAfterSaleStatus("REFUNDED")).toBe("已退款");
    expect(formatAfterSaleType("EXCHANGE")).toBe("换货");
  });

  it("maps order status to visual badge tone", () => {
    expect(badgeToneForOrder("TO_SHIP")).toBe("accent");
    expect(badgeToneForOrder("COMPLETED")).toBe("success");
    expect(badgeToneForOrder("AFTER_SALE")).toBe("warning");
    expect(badgeToneForOrder("CANCELLED")).toBe("danger");
    expect(badgeToneForOrder("PAID")).toBe("muted");
  });

  it("generates stable virtual waybill numbers", () => {
    expect(makeVirtualTrackingNo("MO20260528001")).toMatch(/^VL-\d{4}-\d{4}$/);
    expect(makeVirtualTrackingNo("MO20260528001")).toBe(makeVirtualTrackingNo("MO20260528001"));
  });

  it("uses one review-count source instead of double-counting listed reviews", () => {
    expect(visibleReviewCount(2, 2)).toBe(2);
    expect(visibleReviewCount(86, 1)).toBe(86);
  });
});
