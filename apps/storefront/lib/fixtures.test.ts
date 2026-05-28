import { describe, expect, it } from "vitest";
import {
  afterSales,
  availableProducts,
  banners,
  categories,
  getCategory,
  getOrderProduct,
  getProduct,
  getStore,
  merchantApplications,
  orders,
  products,
  stores
} from "./fixtures";

describe("seed fixtures", () => {
  it("covers PRD seed volume requirements for current demo data", () => {
    expect(categories.length).toBeGreaterThanOrEqual(3);
    expect(products.filter((product) => product.status === "ACTIVE" && product.stock > 0).length).toBeGreaterThanOrEqual(8);
    expect(products.length).toBeGreaterThanOrEqual(8);
    expect(orders.length).toBeGreaterThanOrEqual(3);
    expect(afterSales.length).toBeGreaterThanOrEqual(1);
    expect(banners.length).toBeGreaterThanOrEqual(2);
  });

  it("only returns purchasable products for storefront discovery", () => {
    const available = availableProducts();
    expect(available.every((product) => product.status === "ACTIVE" && product.stock > 0)).toBe(true);
    expect(available.some((product) => product.id === "prod-aroma")).toBe(false);
  });

  it("contains merchant onboarding and active store data", () => {
    expect(stores.filter((store) => store.status === "ACTIVE").length).toBeGreaterThanOrEqual(2);
    expect(merchantApplications.some((item) => item.status === "SUBMITTED")).toBe(true);
  });

  it("finds related fixture records by id and order item", () => {
    expect(getProduct("prod-lamp")?.name).toBe("空气感智能台灯");
    expect(getStore("store-minimal")?.name).toBe("极简生活旗舰店");
    expect(getCategory("cat-digital")?.name).toBe("数码生活");
    expect(getOrderProduct(orders[0])?.id).toBe("prod-lamp");
  });
});
