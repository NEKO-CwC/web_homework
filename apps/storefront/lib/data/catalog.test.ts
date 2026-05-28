import { describe, expect, it } from "vitest";
import { searchDiscoverProducts } from "./catalog";

describe("catalog discovery", () => {
  it("searches purchasable products by product text and store name", async () => {
    await expect(searchDiscoverProducts("台灯")).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "prod-lamp" })
    ]));

    await expect(searchDiscoverProducts("极简生活")).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ storeId: "store-minimal" })
    ]));

    await expect(searchDiscoverProducts("睡眠香氛")).resolves.not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "prod-aroma" })
    ]));
  });
});
