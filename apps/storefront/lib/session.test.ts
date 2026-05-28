import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSessionUser, setSessionUser } from "./session";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  userFindUnique: vi.fn(),
  noStore: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("next/cache", () => ({
  unstable_noStore: mocks.noStore
}));

vi.mock("@minimal-mall/db", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

function createCookieStore() {
  const values = new Map<string, string>();
  return {
    get: vi.fn((name: string) => {
      const value = values.get(name);
      return value ? { name, value } : undefined;
    }),
    set: vi.fn((name: string, value: string) => {
      values.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      values.delete(name);
    })
  };
}

describe("session", () => {
  const originalMode = process.env.MALL_WRITE_MODE;

  beforeEach(() => {
    mocks.cookies.mockReset();
    mocks.userFindUnique.mockReset();
    mocks.noStore.mockReset();
    process.env.MALL_WRITE_MODE = originalMode;
  });

  afterEach(() => {
    process.env.MALL_WRITE_MODE = originalMode;
  });

  it("refreshes the session role and store ids from Prisma mode", async () => {
    const cookieStore = createCookieStore();
    mocks.cookies.mockResolvedValue(cookieStore);
    process.env.MALL_WRITE_MODE = "prisma";

    await setSessionUser({
      id: "user-applicant",
      role: "CUSTOMER",
      email: "apply@example.com"
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-applicant",
      role: "MERCHANT",
      status: "ACTIVE",
      email: "apply@example.com",
      phone: "13800000005",
      stores: [{ id: "store-approved" }]
    });

    await expect(getCurrentSessionUser()).resolves.toEqual({
      id: "user-applicant",
      role: "MERCHANT",
      status: "ACTIVE",
      email: "apply@example.com",
      phone: "13800000005",
      storeIds: ["store-approved"]
    });
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-applicant" },
      select: {
        id: true,
        role: true,
        status: true,
        email: true,
        phone: true,
        stores: { select: { id: true } }
      }
    });
  });

  it("rejects stale cookies when the Prisma user is frozen or missing", async () => {
    const cookieStore = createCookieStore();
    mocks.cookies.mockResolvedValue(cookieStore);
    process.env.MALL_WRITE_MODE = "prisma";

    await setSessionUser({
      id: "user-frozen",
      role: "CUSTOMER"
    });
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user-frozen",
      role: "CUSTOMER",
      status: "FROZEN",
      email: null,
      phone: "13800000001",
      stores: []
    });
    await expect(getCurrentSessionUser()).resolves.toBeNull();

    mocks.userFindUnique.mockResolvedValueOnce(null);
    await expect(getCurrentSessionUser()).resolves.toBeNull();
  });

  it("keeps demo mode sessions local to the signed cookie", async () => {
    const cookieStore = createCookieStore();
    mocks.cookies.mockResolvedValue(cookieStore);
    process.env.MALL_WRITE_MODE = "demo";

    await setSessionUser({
      id: "user-demo",
      role: "CUSTOMER",
      phone: "13800000001"
    });

    await expect(getCurrentSessionUser()).resolves.toMatchObject({
      id: "user-demo",
      role: "CUSTOMER",
      phone: "13800000001"
    });
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });
});
