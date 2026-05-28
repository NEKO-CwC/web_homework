import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentCustomerProfile } from "./customer";

const customerProfileFindUnique = vi.fn();
const userFindUnique = vi.fn();

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn()
}));

vi.mock("@minimal-mall/db", () => ({
  prisma: {
    customerProfile: {
      findUnique: customerProfileFindUnique
    },
    user: {
      findUnique: userFindUnique
    }
  }
}));

describe("customer data access", () => {
  const originalMode = process.env.MALL_WRITE_MODE;

  beforeEach(() => {
    process.env.MALL_WRITE_MODE = "prisma";
    customerProfileFindUnique.mockReset();
    userFindUnique.mockReset();
  });

  afterEach(() => {
    process.env.MALL_WRITE_MODE = originalMode;
  });

  it("returns a Prisma customer profile for the current session user", async () => {
    customerProfileFindUnique.mockResolvedValue({
      userId: "user-real-customer",
      nickname: "真实顾客",
      contactPhone: "13800008888",
      defaultAddress: "江西省南昌市红谷滩区真实资料路 1 号",
      user: {
        email: "real-customer@example.com"
      }
    });

    await expect(getCurrentCustomerProfile("user-real-customer")).resolves.toEqual({
      id: "user-real-customer",
      nickname: "真实顾客",
      email: "real-customer@example.com",
      phone: "13800008888",
      defaultAddress: "江西省南昌市红谷滩区真实资料路 1 号"
    });
    expect(customerProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: "user-real-customer" },
      include: { user: true }
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("does not leak seed customer defaults when a Prisma user has no profile yet", async () => {
    customerProfileFindUnique.mockResolvedValue(null);
    userFindUnique.mockResolvedValue({
      email: "missing-profile@example.com",
      phone: "13800007777"
    });

    await expect(getCurrentCustomerProfile("user-missing-profile")).resolves.toEqual({
      id: "user-missing-profile",
      nickname: "",
      email: "missing-profile@example.com",
      phone: "13800007777",
      defaultAddress: ""
    });
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-missing-profile" },
      select: { email: true, phone: true }
    });
  });
});
