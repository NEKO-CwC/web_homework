import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@minimal-mall/auth";
import {
  getDemoCustomerProfile,
  getDemoOrder,
  getDemoProduct,
  getDemoStore,
  listDemoAfterSales,
  listDemoAvailableProducts,
  listDemoHomeBanners,
  listDemoProducts,
  resetDemoState,
  updateDemoSystemSetting
} from "../demo-state";
import { DemoMallWriteService, PrismaMallWriteService } from "./mall-service";

function createMockDb() {
  const db = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    customerProfile: {
      upsert: vi.fn()
    },
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    cartItem: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    orderItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    payment: {
      create: vi.fn()
    },
    shipment: {
      create: vi.fn(),
      updateMany: vi.fn()
    },
    afterSaleRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn()
    },
    merchantApplication: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    store: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    productImage: {
      update: vi.fn(),
      create: vi.fn()
    },
    homeBanner: {
      update: vi.fn(),
      create: vi.fn()
    },
    systemSetting: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    $transaction: vi.fn(async (input: unknown) => {
      if (typeof input === "function") {
        return input(db);
      }
      return Promise.all(input as Promise<unknown>[]);
    })
  };

  return db;
}

describe("DemoMallWriteService", () => {
  const service = new DemoMallWriteService();

  beforeEach(() => {
    resetDemoState();
  });

  it("returns checkout and receipt messages through state transitions", async () => {
    await expect(service.checkout({
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "balance"
    })).resolves.toContain("待发货");
    await expect(service.checkout({
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "fail"
    })).resolves.toContain("待支付");
    await expect(service.retryPayment({
      orderNo: "MO20260524003",
      paymentMethod: "balance"
    })).resolves.toContain("待发货");

    await expect(service.confirmReceive({
      userId: "user-customer-1",
      orderNo: "MO20260527008",
      status: "SHIPPED"
    })).resolves.toContain("已确认收货");
    expect(getDemoOrder("MO20260527008")).toMatchObject({
      status: "DELIVERED",
      shipment: expect.objectContaining({ status: "DELIVERED" })
    });
  });

  it("returns a customer session for demo login and registration", async () => {
    await expect(service.login({
      account: "customer@example.com",
      password: "12345678"
    })).resolves.toMatchObject({
      message: "登录成功，已进入顾客前台",
      user: { id: "user-customer-1", role: "CUSTOMER" }
    });

    await expect(service.registerCustomer({
      account: "new@example.com",
      password: "12345678",
      nickname: "新会员",
      contactPhone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).resolves.toMatchObject({
      message: "注册成功，已进入顾客前台",
      user: { id: "user-demo-2", role: "CUSTOMER", email: "new@example.com" }
    });
    expect(getDemoCustomerProfile("user-demo-2")).toMatchObject({
      nickname: "新会员",
      email: "new@example.com",
      phone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    });
    await expect(service.login({
      account: "new@example.com",
      password: "12345678"
    })).resolves.toMatchObject({
      message: "登录成功，已进入顾客前台",
      user: { id: "user-demo-2", role: "CUSTOMER", email: "new@example.com" }
    });
    await expect(service.registerCustomer({
      account: "new@example.com",
      password: "12345678",
      nickname: "重复会员",
      contactPhone: "13800000019",
      defaultAddress: "江西省南昌市红谷滩区学府大道 1000 号"
    })).rejects.toThrow("手机号或邮箱已注册");
  });

  it("enforces demo system settings for registration and merchant applications", async () => {
    updateDemoSystemSetting("memberRegistration", "disabled");
    await expect(service.registerCustomer({
      account: "new@example.com",
      password: "12345678",
      nickname: "新会员",
      contactPhone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).rejects.toThrow("会员注册已暂停");

    updateDemoSystemSetting("memberRegistration", "enabled");
    updateDemoSystemSetting("merchantManualReview", "auto");
    await expect(service.submitMerchantApplication({
      userId: "user-customer-1",
      storeName: "自动审核店铺",
      categoryId: "cat-digital",
      description: "自动审核后直接生成店铺。",
      licenseImageUrl: "/uploads/license-auto.png"
    })).resolves.toContain("自动通过");
    await expect(service.submitMerchantApplication({
      userId: "merchant-1",
      storeName: "重复开店",
      categoryId: "cat-digital",
      description: "已有店铺不能重复开店。",
      licenseImageUrl: "/uploads/license-repeat.png"
    })).rejects.toThrow("当前账号已拥有店铺");
  });

  it("rejects invalid demo account profile and merchant form payloads", async () => {
    await expect(service.registerCustomer({
      account: "",
      password: "12345678",
      nickname: "新会员",
      contactPhone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).rejects.toThrow("请输入手机号或邮箱");

    await expect(service.saveProfile({
      nickname: "",
      contactPhone: "13800000001",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).rejects.toThrow("昵称不能为空");

    await expect(service.submitMerchantApplication({
      userId: "user-customer-1",
      storeName: "店",
      categoryId: "cat-digital",
      description: "店铺介绍符合长度。",
      licenseImageUrl: "/uploads/license-demo.png"
    })).rejects.toThrow("店铺名称至少 2 个字");

    await expect(service.updateStoreProfile({
      storeId: "store-minimal",
      name: "极简生活旗舰店",
      categoryId: "",
      description: "桌面数码与轻办公设备精选。"
    })).rejects.toThrow("请选择经营类目");
  });

  it("returns role-specific sessions for seeded demo accounts", async () => {
    await expect(service.login({
      account: "merchant@example.com",
      password: "12345678"
    })).resolves.toMatchObject({
      message: "登录成功，已进入商家中台",
      user: { id: "merchant-1", role: "MERCHANT", storeIds: ["store-minimal"] }
    });
    await expect(service.login({
      account: "admin@example.com",
      password: "12345678"
    })).resolves.toMatchObject({
      message: "登录成功，已进入管理员后台",
      user: { id: "admin-1", role: "ADMIN" }
    });
    await expect(service.login({
      account: "customer@example.com",
      password: "wrong-pass"
    })).rejects.toThrow("账号或密码错误");
    await expect(service.login({
      account: "missing@example.com",
      password: "12345678"
    })).rejects.toThrow("账号或密码错误");
  });

  it("creates deterministic virtual shipment numbers", async () => {
    const result = await service.createShipment({
      orderNo: "MO20260528001",
      status: "TO_SHIP"
    });
    expect(result.trackingNo).toMatch(/^VL-\d{4}-\d{4}$/);
    expect(result.message).toContain(result.trackingNo);
  });

  it("rejects invalid merchant review input", async () => {
    await expect(service.reviewMerchantApplication({ action: "reject" })).rejects.toThrow("驳回必须填写原因");
  });

  it("handles after-sale actions through shared transitions", async () => {
    await expect(service.handleAfterSale({
      action: "approve",
      reply: "同意换货"
    })).resolves.toContain("售后已通过");
    expect(listDemoAfterSales().find((item) => item.id === "after-1")).toMatchObject({
      status: "APPROVED",
      merchantReply: "同意换货"
    });
    expect(getDemoOrder("MO20260526002")).toMatchObject({
      status: "AFTER_SALE"
    });
  });

  it("covers demo write operations with deterministic feedback", async () => {
    await expect(service.saveProfile({
      nickname: "林一",
      contactPhone: "13800000001",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).resolves.toContain("已保存");
    expect(getDemoCustomerProfile()).toMatchObject({
      nickname: "林一",
      phone: "13800000001",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    });
    await expect(service.addCartItem({
      productName: "空气感智能台灯",
      stock: 1
    })).resolves.toMatchObject({ cartDelta: "1" });
    await expect(service.updateCartQuantity({
      cartItemId: "cart-1",
      quantity: 2
    })).resolves.toContain("2");
    await expect(service.removeCartItem({
      cartItemId: "cart-1"
    })).resolves.toContain("已删除");
    await expect(service.confirmReceive({
      orderNo: "MO20260527009",
      status: "SHIPPED"
    })).resolves.toContain("已确认收货");
    await expect(service.submitReview({
      orderItemId: "item-e2e-review-desktop",
      rating: 5,
      content: "很适合桌面学习。"
    })).resolves.toContain("评价已提交");
    expect(getDemoOrder("MO20260527009")?.items[0]).toMatchObject({
      id: "item-e2e-review-desktop",
      reviewed: true
    });
    await expect(service.createAfterSale({
      orderItemId: "item-2",
      type: "EXCHANGE",
      reason: "颜色与预期不符",
      description: "希望换成黑色款。"
    })).resolves.toContain("售后申请已提交");
    expect(listDemoAfterSales().find((item) => item.orderItemId === "item-2")).toMatchObject({
      status: "REQUESTED",
      reason: "颜色与预期不符"
    });
    await expect(service.submitMerchantApplication({
      userId: "user-customer-1",
      storeName: "新店",
      categoryId: "cat-digital",
      description: "经营桌面用品和轻办公配件。",
      licenseImageUrl: "/uploads/license.png"
    })).resolves.toContain("待审核");
    await expect(service.publishProduct({
      storeId: "store-minimal",
      name: "桌面新品",
      priceCents: 9900,
      stock: 5,
      imageUrl: "/products/new.png",
      description: "用于测试的桌面新品。"
    })).resolves.toContain("已发布");
    await expect(service.updateStoreProfile({
      storeId: "store-minimal",
      name: "极简生活旗舰店",
      categoryId: "cat-digital",
      description: "桌面数码与轻办公设备精选。"
    })).resolves.toContain("店铺资料已保存");
    await expect(service.updateProduct({
      productId: "prod-lamp",
      storeId: "store-minimal",
      name: "空气感智能台灯",
      priceCents: 32900,
      stock: 10,
      imageUrl: "/products/lamp.png",
      description: "低眩光面板和三档色温。"
    })).resolves.toContain("商品资料已保存");
    await expect(service.updateProductStatus({
      productId: "prod-lamp",
      status: "ACTIVE"
    })).resolves.toContain("商品已上架");
    await expect(service.updateStoreStatus({
      actorId: "admin-1",
      storeId: "store-minimal",
      status: "ACTIVE"
    })).resolves.toContain("店铺复核完成");
    await expect(service.handleAfterSale({
      action: "reject",
      reply: "不符合售后条件"
    })).resolves.toContain("售后已驳回");
    await expect(service.reviewMerchantApplication({
      action: "approve"
    })).resolves.toContain("店铺已生成");
    await expect(service.saveHomeBanner({
      id: "banner-1",
      title: "验收 Banner",
      subtitle: "首页保存后同步展示",
      imageUrl: "/banners/desk-refresh.jpg",
      linkUrl: "/",
      status: "ONLINE"
    })).resolves.toContain("首页配置已保存");
    expect(listDemoHomeBanners()[0]).toMatchObject({
      id: "banner-1",
      title: "验收 Banner",
      subtitle: "首页保存后同步展示"
    });
    await expect(service.updateSystemSetting({
      key: "homeCacheVersion"
    })).resolves.toContain("系统配置已更新");
  });

  it("keeps demo merchant product and store writes visible to read helpers", async () => {
    await expect(service.publishProduct({
      actorId: "merchant-1",
      storeId: "store-minimal",
      categoryId: "cat-digital",
      name: "桌面状态同步新品",
      priceCents: 19900,
      stock: 7,
      imageUrl: "/products/demo-sync.png",
      description: "发布后应立即出现在顾客前台。"
    })).resolves.toContain("已发布");

    const created = listDemoProducts().find((product) => product.name === "桌面状态同步新品");
    expect(created).toMatchObject({
      storeId: "store-minimal",
      status: "ACTIVE",
      imageUrl: "/products/demo-sync.png"
    });
    expect(listDemoAvailableProducts().some((product) => product.id === created?.id)).toBe(true);

    await expect(service.updateProduct({
      actorId: "merchant-1",
      productId: "prod-lamp",
      storeId: "store-minimal",
      categoryId: "cat-digital",
      name: "空气感智能台灯 Pro",
      priceCents: 35900,
      stock: 9,
      imageUrl: "/products/lamp-pro.jpg",
      description: "保存后前台详情同步展示。"
    })).resolves.toContain("商品资料已保存");
    expect(getDemoProduct("prod-lamp")).toMatchObject({
      name: "空气感智能台灯 Pro",
      priceCents: 35900,
      stock: 9,
      status: "ACTIVE",
      imageUrl: "/products/lamp-pro.jpg"
    });

    await expect(service.updateProductStatus({
      actorId: "merchant-1",
      productId: "prod-lamp",
      status: "OFF_SHELF"
    })).resolves.toContain("商品已下架");
    expect(getDemoProduct("prod-lamp")?.status).toBe("OFF_SHELF");
    expect(listDemoAvailableProducts().some((product) => product.id === "prod-lamp")).toBe(false);

    await expect(service.updateStoreProfile({
      actorId: "merchant-1",
      storeId: "store-minimal",
      name: "极简生活同步店",
      categoryId: "cat-digital",
      description: "保存后管理员和前台同步展示。"
    })).resolves.toContain("店铺资料已保存");
    expect(getDemoStore("store-minimal")).toMatchObject({
      name: "极简生活同步店",
      description: "保存后管理员和前台同步展示。"
    });
  });

  it("enforces demo merchant ownership and frozen store product rules", async () => {
    await expect(service.updateStoreProfile({
      actorId: "merchant-2",
      storeId: "store-minimal",
      name: "越权店铺",
      categoryId: "cat-home",
      description: "非店主不能维护该店铺。"
    })).rejects.toThrow("只能维护自己的店铺");

    await expect(service.updateProductStatus({
      actorId: "merchant-1",
      productId: "prod-aroma",
      status: "ACTIVE"
    })).rejects.toThrow("只能管理自己店铺的商品");

    await expect(service.updateStoreStatus({
      actorId: "admin-1",
      storeId: "store-minimal",
      status: "FROZEN"
    })).resolves.toContain("店铺已冻结");
    expect(getDemoStore("store-minimal")?.status).toBe("FROZEN");
    expect(getDemoProduct("prod-lamp")?.status).toBe("OFF_SHELF");
    expect(listDemoAvailableProducts().some((product) => product.storeId === "store-minimal")).toBe(false);

    await expect(service.publishProduct({
      actorId: "merchant-1",
      storeId: "store-minimal",
      name: "冻结店铺新品",
      priceCents: 9900,
      stock: 3,
      imageUrl: "/products/frozen.png",
      description: "冻结店铺不能发布新商品。"
    })).rejects.toThrow("店铺已冻结");
    await expect(service.updateProductStatus({
      actorId: "merchant-1",
      productId: "prod-lamp",
      status: "ACTIVE"
    })).rejects.toThrow("店铺已冻结");

    await expect(service.updateStoreStatus({
      actorId: "admin-1",
      storeId: "store-minimal",
      status: "ACTIVE"
    })).resolves.toContain("店铺已恢复经营");
    await expect(service.updateProductStatus({
      actorId: "merchant-1",
      productId: "prod-lamp",
      status: "ACTIVE"
    })).resolves.toContain("商品已上架");
    expect(listDemoAvailableProducts().some((product) => product.id === "prod-lamp")).toBe(true);
  });

  it("rejects invalid demo product payloads before writing", async () => {
    await expect(service.publishProduct({
      actorId: "merchant-1",
      storeId: "store-minimal",
      name: "无效商品",
      priceCents: 0,
      stock: 3,
      imageUrl: "/products/invalid.png",
      description: "价格不能为零。"
    })).rejects.toThrow("商品价格必须大于 0");

    await expect(service.updateProduct({
      actorId: "merchant-1",
      productId: "prod-lamp",
      storeId: "store-minimal",
      name: "空气感智能台灯",
      priceCents: 32900,
      stock: -1,
      imageUrl: "/products/lamp.jpg",
      description: "库存不能是负数。"
    })).rejects.toThrow("商品库存必须是非负整数");
  });

  it("rejects demo cart and shipment invalid transitions", async () => {
    await expect(service.addCartItem({
      productName: "缺货商品",
      stock: 0
    })).rejects.toThrow("库存不足");
    await expect(service.updateCartQuantity({
      cartItemId: "cart-1",
      quantity: 0
    })).rejects.toThrow("购物车数量不能小于 1");
    await expect(service.confirmReceive({
      orderNo: "MO20260528001",
      status: "TO_SHIP"
    })).rejects.toThrow("只有运输中订单可以确认收货");
    await expect(service.confirmReceive({
      userId: "other-customer",
      orderNo: "MO20260527009",
      status: "SHIPPED"
    })).rejects.toThrow("只能确认自己的订单");
  });
});

describe("PrismaMallWriteService", () => {
  it("verifies passwords and returns a session on login", async () => {
    const db = createMockDb();
    db.user.findFirst.mockResolvedValue({
      id: "user-customer-1",
      email: "customer@example.com",
      phone: "13800000001",
      passwordHash: await hashPassword("12345678", "fixed-salt"),
      role: "CUSTOMER",
      status: "ACTIVE"
    });
    const service = new PrismaMallWriteService(db as never);

    await expect(service.login({
      account: "customer@example.com",
      password: "12345678"
    })).resolves.toMatchObject({
      message: "登录成功，已进入顾客前台",
      user: { id: "user-customer-1", role: "CUSTOMER" }
    });
    await expect(service.login({
      account: "customer@example.com",
      password: "wrong-pass"
    })).rejects.toThrow("账号或密码错误");
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("records successful administrator login without storing credentials", async () => {
    const db = createMockDb();
    db.user.findFirst.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      phone: null,
      passwordHash: await hashPassword("12345678", "fixed-salt"),
      role: "ADMIN",
      status: "ACTIVE"
    });
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.login({
      account: "admin@example.com",
      password: "12345678"
    })).resolves.toMatchObject({
      message: "登录成功，已进入管理员后台",
      user: { id: "admin-1", role: "ADMIN" }
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        action: "ADMIN_LOGIN",
        targetType: "User",
        targetId: "admin-1",
        metadata: { account: "admin@example.com" },
        result: "SUCCESS",
        ipAddress: "127.0.0.1"
      }
    });
  });

  it("registers a customer with a hashed password and profile", async () => {
    const db = createMockDb();
    db.systemSetting.findUnique.mockResolvedValue({ key: "memberRegistration", value: "enabled" });
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      phone: "13800000009",
      role: "CUSTOMER"
    });
    const service = new PrismaMallWriteService(db as never);

    await expect(service.registerCustomer({
      account: "new@example.com",
      password: "12345678",
      nickname: "新会员",
      contactPhone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).resolves.toMatchObject({
      message: "注册成功，已进入顾客前台",
      user: { id: "new-user", role: "CUSTOMER" }
    });

    const createArg = db.user.create.mock.calls[0]?.[0];
    expect(createArg.data.passwordHash).toMatch(/^scrypt:/);
    expect(createArg.data.passwordHash).not.toContain("12345678");
    expect(createArg.data.customerProfile.create).toMatchObject({
      nickname: "新会员",
      contactPhone: "13800000009"
    });
  });

  it("blocks customer registration when member registration is disabled", async () => {
    const db = createMockDb();
    db.systemSetting.findUnique.mockResolvedValue({ key: "memberRegistration", value: "disabled" });
    const service = new PrismaMallWriteService(db as never);

    await expect(service.registerCustomer({
      account: "new@example.com",
      password: "12345678",
      nickname: "新会员",
      contactPhone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).rejects.toThrow("会员注册已暂停");
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("validates prisma registration and profile payloads before database writes", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);

    await expect(service.registerCustomer({
      account: "new@example.com",
      password: "123",
      nickname: "新会员",
      contactPhone: "13800000009",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).rejects.toThrow("密码至少 6 位");
    expect(db.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();

    await expect(service.saveProfile({
      userId: "user-customer-1",
      nickname: "林一",
      contactPhone: "12345",
      defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
    })).rejects.toThrow("联系电话不能为空");
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.customerProfile.upsert).not.toHaveBeenCalled();
  });

  it("increments an existing purchasable cart item", async () => {
    const db = createMockDb();
    db.product.findUnique.mockResolvedValue({
      id: "prod-lamp",
      name: "空气感智能台灯",
      status: "ACTIVE",
      stock: 3,
      store: { status: "ACTIVE" }
    });
    db.cartItem.findUnique.mockResolvedValue({ quantity: 1 });
    db.cartItem.upsert.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    const result = await service.addCartItem({
      userId: "user-customer-1",
      productId: "prod-lamp",
      productName: "空气感智能台灯",
      stock: 3
    });

    expect(result.message).toContain("空气感智能台灯");
    expect(db.cartItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { quantity: { increment: 1 } }
    }));
  });

  it("rejects cart additions for missing unavailable or overstocked products", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);

    db.product.findUnique.mockResolvedValue(null);
    await expect(service.addCartItem({
      userId: "user-customer-1",
      productId: "prod-missing",
      productName: "不存在商品",
      stock: 1
    })).rejects.toThrow("商品不存在");

    db.product.findUnique.mockResolvedValue({
      id: "prod-frozen",
      name: "冻结商品",
      status: "ACTIVE",
      stock: 3,
      store: { status: "FROZEN" }
    });
    await expect(service.addCartItem({
      userId: "user-customer-1",
      productId: "prod-frozen",
      productName: "冻结商品",
      stock: 3
    })).rejects.toThrow("库存不足或店铺冻结");

    db.product.findUnique.mockResolvedValue({
      id: "prod-lamp",
      name: "空气感智能台灯",
      status: "ACTIVE",
      stock: 2,
      store: { status: "ACTIVE" }
    });
    db.cartItem.findUnique.mockResolvedValue({ quantity: 2 });
    await expect(service.addCartItem({
      userId: "user-customer-1",
      productId: "prod-lamp",
      productName: "空气感智能台灯",
      stock: 2
    })).rejects.toThrow("购物车数量已达到库存上限");
  });

  it("updates cart quantity with ownership and stock validation", async () => {
    const db = createMockDb();
    db.cartItem.findUnique.mockResolvedValue({
      id: "cart-1",
      userId: "user-customer-1",
      quantity: 1,
      product: {
        name: "空气感智能台灯",
        stock: 3
      }
    });
    db.cartItem.update.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateCartQuantity({
      userId: "user-customer-1",
      cartItemId: "cart-1",
      quantity: 3
    })).resolves.toContain("3");

    expect(db.cartItem.update).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: { quantity: 3 }
    });
    await expect(service.updateCartQuantity({
      userId: "user-customer-1",
      cartItemId: "cart-1",
      quantity: 4
    })).rejects.toThrow("不能超过库存");
  });

  it("removes only the current user's cart item", async () => {
    const db = createMockDb();
    db.cartItem.findUnique.mockResolvedValue({
      id: "cart-1",
      userId: "user-customer-1",
      product: { name: "空气感智能台灯" }
    });
    db.cartItem.delete.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.removeCartItem({
      userId: "user-customer-1",
      cartItemId: "cart-1"
    })).resolves.toContain("空气感智能台灯");
    expect(db.cartItem.delete).toHaveBeenCalledWith({ where: { id: "cart-1" } });

    db.cartItem.findUnique.mockResolvedValue({
      id: "cart-2",
      userId: "other-user",
      product: { name: "旅行降噪耳机" }
    });
    await expect(service.removeCartItem({
      userId: "user-customer-1",
      cartItemId: "cart-2"
    })).rejects.toThrow("无权删除");
  });

  it("creates a paid order from cart items and clears the cart", async () => {
    const db = createMockDb();
    db.cartItem.findMany.mockResolvedValue([
      {
        productId: "prod-lamp",
        quantity: 2,
        product: {
          id: "prod-lamp",
          name: "空气感智能台灯",
          storeId: "store-minimal",
          priceCents: 32900,
          stock: 5,
          status: "ACTIVE",
          store: { status: "ACTIVE" }
        }
      }
    ]);
    db.order.create.mockResolvedValue({ orderNo: "MO20260528099", status: "TO_SHIP" });
    db.product.update.mockResolvedValue({});
    db.cartItem.deleteMany.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.checkout({
      userId: "user-customer-1",
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "balance"
    })).resolves.toContain("待发货");

    expect(db.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalAmountCents: 61800,
        status: "TO_SHIP"
      })
    }));
    const createArg = db.order.create.mock.calls[0]?.[0];
    expect(createArg.data.payments.create.amountCents).toBe(61800);
    expect(db.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "prod-lamp" },
      data: { stock: { decrement: 2 } }
    }));
    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-customer-1" } });
  });

  it("creates a pending order when virtual payment fails without decrementing stock", async () => {
    const db = createMockDb();
    db.cartItem.findMany.mockResolvedValue([
      {
        productId: "prod-lamp",
        quantity: 1,
        product: {
          id: "prod-lamp",
          name: "空气感智能台灯",
          storeId: "store-minimal",
          priceCents: 32900,
          stock: 5,
          status: "ACTIVE",
          store: { status: "ACTIVE" }
        }
      }
    ]);
    db.order.create.mockResolvedValue({ orderNo: "MO20260528098", status: "PENDING_PAYMENT" });
    db.cartItem.deleteMany.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.checkout({
      userId: "user-customer-1",
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "fail"
    })).resolves.toContain("待支付");

    expect(db.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "PENDING_PAYMENT",
        payments: {
          create: expect.objectContaining({
            method: "fail",
            status: "FAILED"
          })
        },
        items: {
          create: [
            expect.objectContaining({
              productId: "prod-lamp",
              status: "PENDING_PAYMENT"
            })
          ]
        }
      })
    }));
    expect(db.product.update).not.toHaveBeenCalled();
    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-customer-1" } });
  });

  it("creates a paid order from a direct product without clearing the cart", async () => {
    const db = createMockDb();
    db.product.findUnique.mockResolvedValue({
      id: "prod-headphone",
      name: "旅行降噪耳机",
      storeId: "store-minimal",
      priceCents: 59900,
      stock: 64,
      status: "ACTIVE",
      store: { status: "ACTIVE" }
    });
    db.order.create.mockResolvedValue({ orderNo: "MO20260528100", status: "TO_SHIP" });
    db.product.update.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.checkout({
      userId: "user-customer-1",
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "balance",
      productId: "prod-headphone",
      quantity: 1
    })).resolves.toContain("待发货");

    const createArg = db.order.create.mock.calls[0]?.[0];
    expect(createArg.data.totalAmountCents).toBe(55900);
    expect(createArg.data.payments.create.amountCents).toBe(55900);
    expect(createArg.data.items.create).toEqual([
      expect.objectContaining({
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        status: "TO_SHIP"
      })
    ]);
    expect(db.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "prod-headphone" },
      data: { stock: { decrement: 1 } }
    }));
    expect(db.cartItem.findMany).not.toHaveBeenCalled();
    expect(db.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects invalid direct checkout requests before creating an order", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);

    await expect(service.checkout({
      userId: "user-customer-1",
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "balance",
      productId: "prod-headphone",
      quantity: 0
    })).rejects.toThrow("购买数量必须大于 0");

    db.product.findUnique.mockResolvedValue(null);
    await expect(service.checkout({
      userId: "user-customer-1",
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "balance",
      productId: "prod-missing",
      quantity: 1
    })).rejects.toThrow("商品不存在");

    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("rejects checkout when cart is empty or stock is unavailable", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);
    const checkoutInput = {
      userId: "user-customer-1",
      receiver: "林一",
      phone: "13800000001",
      address: "江西省南昌市红谷滩区学府大道 999 号",
      paymentMethod: "balance"
    };

    db.cartItem.findMany.mockResolvedValue([]);
    await expect(service.checkout(checkoutInput)).rejects.toThrow("购物车为空");

    db.cartItem.findMany.mockResolvedValue([
      {
        productId: "prod-lamp",
        quantity: 2,
        product: {
          id: "prod-lamp",
          name: "空气感智能台灯",
          storeId: "store-minimal",
          priceCents: 32900,
          stock: 1,
          status: "ACTIVE",
          store: { status: "ACTIVE" }
        }
      }
    ]);
    await expect(service.checkout(checkoutInput)).rejects.toThrow("库存不足");
  });

  it("retries a pending payment and advances the order to fulfillment", async () => {
    const db = createMockDb();
    db.order.findUnique.mockResolvedValue({
      id: "order-5",
      userId: "user-customer-1",
      orderNo: "MO20260524003",
      status: "PENDING_PAYMENT",
      totalAmountCents: 25900,
      items: [
        {
          productId: "prod-charger",
          quantity: 1,
          product: {
            id: "prod-charger",
            name: "模块化桌面充电站",
            stock: 8,
            status: "ACTIVE",
            store: { status: "ACTIVE" }
          }
        }
      ]
    });
    db.product.update.mockResolvedValue({});
    db.orderItem.updateMany.mockResolvedValue({});
    db.order.update.mockResolvedValue({ orderNo: "MO20260524003", status: "TO_SHIP" });
    db.payment.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.retryPayment({
      userId: "user-customer-1",
      orderNo: "MO20260524003",
      paymentMethod: "balance"
    })).resolves.toContain("待发货");

    expect(db.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "prod-charger" },
      data: { stock: { decrement: 1 } }
    }));
    expect(db.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-5" },
      data: { status: "TO_SHIP" }
    });
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: "order-5" },
      data: { status: "TO_SHIP" }
    });
    expect(db.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "order-5",
        method: "balance",
        amountCents: 25900,
        status: "SUCCESS"
      })
    });
  });

  it("rejects invalid payment retries", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);
    const retryInput = {
      userId: "user-customer-1",
      orderNo: "MO20260524003",
      paymentMethod: "balance"
    };

    db.order.findUnique.mockResolvedValue(null);
    await expect(service.retryPayment(retryInput)).rejects.toThrow("订单不存在");

    db.order.findUnique.mockResolvedValue({
      id: "order-5",
      userId: "other-user",
      status: "PENDING_PAYMENT",
      items: []
    });
    await expect(service.retryPayment(retryInput)).rejects.toThrow("只能支付自己的订单");

    db.order.findUnique.mockResolvedValue({
      id: "order-5",
      userId: "user-customer-1",
      status: "TO_SHIP",
      items: []
    });
    await expect(service.retryPayment(retryInput)).rejects.toThrow("只有待支付订单");

    db.order.findUnique.mockResolvedValue({
      id: "order-5",
      userId: "user-customer-1",
      status: "PENDING_PAYMENT",
      items: []
    });
    await expect(service.retryPayment(retryInput)).rejects.toThrow("订单没有商品");

    db.order.findUnique.mockResolvedValue({
      id: "order-5",
      userId: "user-customer-1",
      status: "PENDING_PAYMENT",
      items: [
        {
          productId: "prod-lamp",
          quantity: 2,
          product: {
            name: "空气感智能台灯",
            stock: 1,
            status: "ACTIVE",
            store: { status: "ACTIVE" }
          }
        }
      ]
    });
    await expect(service.retryPayment(retryInput)).rejects.toThrow("库存不足");
    expect(db.order.update).not.toHaveBeenCalled();
  });

  it("confirms receipt only for the owning customer", async () => {
    const db = createMockDb();
    db.order.findUnique.mockResolvedValue({
      id: "order-ship",
      userId: "user-customer-1",
      orderNo: "MO20260527008",
      status: "SHIPPED"
    });
    db.order.update.mockResolvedValue({});
    db.orderItem.updateMany.mockResolvedValue({});
    db.shipment.updateMany.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.confirmReceive({
      userId: "user-customer-1",
      orderNo: "MO20260527008",
      status: "SHIPPED"
    })).resolves.toContain("已确认收货");

    expect(db.order.update).toHaveBeenCalledWith({
      where: { orderNo: "MO20260527008" },
      data: { status: "DELIVERED" }
    });
    expect(db.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-ship" },
      data: { status: "DELIVERED" }
    });
    expect(db.shipment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-ship" },
      data: { status: "DELIVERED" }
    });

    db.order.findUnique.mockResolvedValue({
      id: "order-other",
      userId: "other-customer",
      orderNo: "MO20260527009",
      status: "SHIPPED"
    });
    await expect(service.confirmReceive({
      userId: "user-customer-1",
      orderNo: "MO20260527009",
      status: "SHIPPED"
    })).rejects.toThrow("只能确认自己的订单");
  });

  it("saves a merchant store profile only for its owner", async () => {
    const db = createMockDb();
    db.store.findUnique.mockResolvedValue({
      id: "store-minimal",
      ownerId: "merchant-1",
      status: "ACTIVE"
    });
    db.store.update.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateStoreProfile({
      actorId: "merchant-1",
      storeId: "store-minimal",
      name: "极简生活旗舰店",
      categoryId: "cat-digital",
      description: "桌面数码与轻办公设备精选。"
    })).resolves.toContain("店铺资料已保存");
    expect(db.store.update).toHaveBeenCalledWith({
      where: { id: "store-minimal" },
      data: {
        name: "极简生活旗舰店",
        categoryId: "cat-digital",
        description: "桌面数码与轻办公设备精选。"
      }
    });

    await expect(service.updateStoreProfile({
      actorId: "merchant-2",
      storeId: "store-minimal",
      name: "越权店铺",
      categoryId: "cat-home",
      description: "这不是自己的店铺。"
    })).rejects.toThrow("只能维护自己的店铺");
  });

  it("validates prisma store profile payloads before database writes", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateStoreProfile({
      actorId: "merchant-1",
      storeId: "store-minimal",
      name: "店",
      categoryId: "cat-digital",
      description: "桌面数码与轻办公设备精选。"
    })).rejects.toThrow("店铺名称至少 2 个字");
    expect(db.store.findUnique).not.toHaveBeenCalled();
    expect(db.store.update).not.toHaveBeenCalled();
  });

  it("validates prisma product payloads before database writes", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);

    await expect(service.publishProduct({
      actorId: "merchant-1",
      storeId: "store-minimal",
      name: "新品",
      priceCents: 9900,
      stock: -1,
      imageUrl: "/products/new.png",
      description: "库存不能是负数。"
    })).rejects.toThrow("商品库存必须是非负整数");
    expect(db.store.findUnique).not.toHaveBeenCalled();
    expect(db.product.create).not.toHaveBeenCalled();

    await expect(service.updateProduct({
      actorId: "merchant-1",
      productId: "prod-lamp",
      storeId: "store-minimal",
      name: "空气感智能台灯",
      priceCents: 32900,
      stock: 5,
      imageUrl: "",
      description: "商品图片不能为空。"
    })).rejects.toThrow("请提供商品图片");
    expect(db.product.findUnique).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("updates a product and its image for the owning merchant", async () => {
    const db = createMockDb();
    db.product.findUnique.mockResolvedValue({
      id: "prod-lamp",
      categoryId: "cat-digital",
      store: { ownerId: "merchant-1", status: "ACTIVE" },
      images: [{ id: "img-1" }]
    });
    db.product.update.mockResolvedValue({});
    db.productImage.update.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateProduct({
      actorId: "merchant-1",
      productId: "prod-lamp",
      storeId: "store-minimal",
      categoryId: "cat-digital",
      name: "空气感智能台灯 Pro",
      priceCents: 35900,
      stock: 9,
      imageUrl: "/products/lamp-pro.jpg",
      description: "低眩光面板和三档色温。"
    })).resolves.toContain("商品资料已保存");

    expect(db.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "prod-lamp" },
      data: expect.objectContaining({
        name: "空气感智能台灯 Pro",
        status: "ACTIVE"
      })
    }));
    expect(db.productImage.update).toHaveBeenCalledWith({
      where: { id: "img-1" },
      data: { url: "/products/lamp-pro.jpg" }
    });
  });

  it("changes product shelf status with stock and ownership checks", async () => {
    const db = createMockDb();
    db.product.findUnique.mockResolvedValue({
      id: "prod-lamp",
      stock: 3,
      store: { ownerId: "merchant-1", status: "ACTIVE" }
    });
    db.product.update.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateProductStatus({
      actorId: "merchant-1",
      productId: "prod-lamp",
      status: "OFF_SHELF"
    })).resolves.toContain("商品已下架");
    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: "prod-lamp" },
      data: { status: "OFF_SHELF" }
    });

    db.product.findUnique.mockResolvedValue({
      id: "prod-empty",
      stock: 0,
      store: { ownerId: "merchant-1", status: "ACTIVE" }
    });
    await expect(service.updateProductStatus({
      actorId: "merchant-1",
      productId: "prod-empty",
      status: "ACTIVE"
    })).rejects.toThrow("库存不足");
  });

  it("freezes a store, pulls active products, and audits the change", async () => {
    const db = createMockDb();
    db.store.findUnique.mockResolvedValue({
      id: "store-minimal",
      ownerId: "merchant-1",
      status: "ACTIVE"
    });
    db.store.update.mockResolvedValue({});
    db.product.updateMany.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateStoreStatus({
      actorId: "admin-1",
      storeId: "store-minimal",
      status: "FROZEN"
    })).resolves.toContain("店铺已冻结");
    expect(db.store.update).toHaveBeenCalledWith({
      where: { id: "store-minimal" },
      data: { status: "FROZEN" }
    });
    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { storeId: "store-minimal", status: "ACTIVE" },
      data: { status: "OFF_SHELF" }
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "STORE_FREEZE" })
    }));

    db.store.findUnique.mockResolvedValue({
      id: "store-minimal",
      ownerId: "merchant-1",
      status: "FROZEN"
    });
    db.store.update.mockClear();
    db.product.updateMany.mockClear();
    db.auditLog.create.mockClear();
    await expect(service.updateStoreStatus({
      actorId: "admin-1",
      storeId: "store-minimal",
      status: "FROZEN"
    })).resolves.toContain("店铺复核完成");
    expect(db.store.update).not.toHaveBeenCalled();
    expect(db.product.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "STORE_REVIEW",
        metadata: { status: "FROZEN", reviewedOnly: true }
      })
    }));

    await expect(service.updateStoreStatus({
      storeId: "store-minimal",
      status: "ACTIVE"
    })).rejects.toThrow("只有管理员");
  });

  it("creates a shipment, advances order state, and writes an audit log", async () => {
    const db = createMockDb();
    db.order.findUnique.mockResolvedValue({
      id: "order-1",
      orderNo: "MO20260528001",
      status: "TO_SHIP",
      items: [{ storeId: "store-minimal", status: "TO_SHIP", store: { ownerId: "merchant-1" } }],
      shipments: []
    });
    db.order.update.mockResolvedValue({});
    db.orderItem.updateMany.mockResolvedValue({});
    db.shipment.create.mockResolvedValue({ id: "ship-new" });
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    const result = await service.createShipment({
      actorId: "merchant-1",
      orderNo: "MO20260528001",
      status: "TO_SHIP"
    });

    expect(result.trackingNo).toMatch(/^VL-\d{4}-\d{4}$/);
    expect(db.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "SHIPPED" }
    }));
    expect(db.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-1", storeId: "store-minimal" },
      data: { status: "SHIPPED" }
    });
    expect(db.shipment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeId: "store-minimal",
        trackingNo: result.trackingNo,
        status: "IN_TRANSIT"
      })
    }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "CREATE_SHIPMENT",
        metadata: expect.objectContaining({ storeId: "store-minimal" })
      })
    }));
  });

  it("ships only the current merchant store items in a multi-store order", async () => {
    const db = createMockDb();
    db.order.findUnique.mockResolvedValue({
      id: "order-multi",
      orderNo: "MO20260528002",
      status: "TO_SHIP",
      items: [
        { storeId: "store-home", status: "TO_SHIP", store: { ownerId: "merchant-2" } },
        { storeId: "store-minimal", status: "TO_SHIP", store: { ownerId: "merchant-1" } }
      ],
      shipments: []
    });
    db.orderItem.updateMany.mockResolvedValue({});
    db.shipment.create.mockResolvedValue({ id: "ship-current-store" });
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    const result = await service.createShipment({
      actorId: "merchant-1",
      storeId: "store-minimal",
      orderNo: "MO20260528002",
      status: "TO_SHIP"
    });

    expect(result.trackingNo).toMatch(/^VL-\d{4}-\d{4}$/);
    expect(db.order.update).not.toHaveBeenCalled();
    expect(db.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-multi", storeId: "store-minimal" },
      data: { status: "SHIPPED" }
    });
    expect(db.shipment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeId: "store-minimal",
        trackingNo: result.trackingNo
      })
    }));
  });

  it("rejects shipment creation for another merchant store", async () => {
    const db = createMockDb();
    db.order.findUnique.mockResolvedValue({
      id: "order-1",
      orderNo: "MO20260528001",
      status: "TO_SHIP",
      items: [{ storeId: "store-home", store: { ownerId: "merchant-2" } }],
      shipments: []
    });
    const service = new PrismaMallWriteService(db as never);

    await expect(service.createShipment({
      actorId: "merchant-1",
      storeId: "store-home",
      orderNo: "MO20260528001",
      status: "TO_SHIP"
    })).rejects.toThrow("只能为自己店铺的订单生成运单");
    expect(db.order.update).not.toHaveBeenCalled();
    expect(db.shipment.create).not.toHaveBeenCalled();
  });

  it("creates an after-sale request with optional evidence", async () => {
    const db = createMockDb();
    db.orderItem.findUnique.mockResolvedValue({
      id: "item-1",
      orderId: "order-1",
      order: {
        userId: "user-customer-1",
        status: "DELIVERED"
      },
      afterSales: []
    });
    db.afterSaleRequest.create.mockResolvedValue({});
    db.orderItem.update.mockResolvedValue({});
    db.order.update.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.createAfterSale({
      userId: "user-customer-1",
      orderItemId: "item-1",
      type: "RETURN_REFUND",
      reason: "包装破损",
      description: "收到时外包装破损，需要退货退款。",
      evidenceUrl: "/uploads/evidence-test.png"
    })).resolves.toContain("售后申请已提交");

    expect(db.afterSaleRequest.create).toHaveBeenCalledWith({
      data: {
        userId: "user-customer-1",
        orderItemId: "item-1",
        type: "RETURN_REFUND",
        reason: "包装破损",
        description: "收到时外包装破损，需要退货退款。",
        evidenceUrl: "/uploads/evidence-test.png",
        status: "REQUESTED"
      }
    });
    expect(db.orderItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { status: "AFTER_SALE" }
    });
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "AFTER_SALE" }
    });
  });

  it("rejects after-sale handling for another merchant store", async () => {
    const db = createMockDb();
    db.afterSaleRequest.findUnique.mockResolvedValue({
      id: "after-1",
      status: "REQUESTED",
      orderItemId: "item-4",
      orderItem: {
        orderId: "order-4",
        store: { ownerId: "merchant-2" }
      }
    });
    const service = new PrismaMallWriteService(db as never);

    await expect(service.handleAfterSale({
      actorId: "merchant-1",
      afterSaleId: "after-1",
      action: "approve",
      reply: "同意换货"
    })).rejects.toThrow("只能处理自己店铺的售后申请");
    expect(db.afterSaleRequest.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects an after-sale request, restores order state, and audits the decision", async () => {
    const db = createMockDb();
    db.afterSaleRequest.findUnique.mockResolvedValue({
      id: "after-1",
      status: "REQUESTED",
      orderItemId: "item-4",
      orderItem: {
        orderId: "order-4",
        store: { ownerId: "merchant-1" }
      }
    });
    db.afterSaleRequest.update.mockResolvedValue({});
    db.afterSaleRequest.count.mockResolvedValue(0);
    db.orderItem.update.mockResolvedValue({});
    db.order.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.handleAfterSale({
      actorId: "merchant-1",
      afterSaleId: "after-1",
      action: "reject",
      reply: "商品不符合售后条件"
    })).resolves.toContain("售后已驳回");

    expect(db.afterSaleRequest.update).toHaveBeenCalledWith({
      where: { id: "after-1" },
      data: {
        status: "REJECTED",
        merchantReply: "商品不符合售后条件"
      }
    });
    expect(db.afterSaleRequest.count).toHaveBeenCalledWith({
      where: {
        id: { not: "after-1" },
        status: { in: ["REQUESTED", "APPROVED", "RETURNING"] },
        orderItem: { orderId: "order-4" }
      }
    });
    expect(db.orderItem.update).toHaveBeenCalledWith({
      where: { id: "item-4" },
      data: { status: "DELIVERED" }
    });
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: "order-4" },
      data: { status: "DELIVERED" }
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "AFTER_SALE_REJECT",
        targetId: "after-1",
        metadata: { reply: "商品不符合售后条件", status: "REJECTED" }
      })
    }));
  });

  it("approves after-sale requests and keeps the customer order in after-sale state", async () => {
    const db = createMockDb();
    db.afterSaleRequest.findUnique.mockResolvedValue({
      id: "after-2",
      status: "REQUESTED",
      orderItemId: "item-6",
      orderItem: {
        orderId: "order-6",
        store: { ownerId: "merchant-1" }
      }
    });
    db.afterSaleRequest.update.mockResolvedValue({});
    db.orderItem.update.mockResolvedValue({});
    db.order.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.handleAfterSale({
      actorId: "merchant-1",
      afterSaleId: "after-2",
      action: "approve",
      reply: "同意退货退款"
    })).resolves.toContain("售后已通过");

    expect(db.afterSaleRequest.count).not.toHaveBeenCalled();
    expect(db.afterSaleRequest.update).toHaveBeenCalledWith({
      where: { id: "after-2" },
      data: {
        status: "APPROVED",
        merchantReply: "同意退货退款"
      }
    });
    expect(db.orderItem.update).toHaveBeenCalledWith({
      where: { id: "item-6" },
      data: { status: "AFTER_SALE" }
    });
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: "order-6" },
      data: { status: "AFTER_SALE" }
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "AFTER_SALE_APPROVE",
        targetId: "after-2",
        metadata: { reply: "同意退货退款", status: "APPROVED" }
      })
    }));
  });

  it("approves a merchant application by creating a store, updating role, and auditing", async () => {
    const db = createMockDb();
    db.merchantApplication.findUnique.mockResolvedValue({
      id: "apply-1",
      userId: "user-applicant",
      categoryId: "cat-fashion",
      storeName: "潮流配件仓",
      description: "主营通勤配件、卡包与旅行小物。",
      status: "SUBMITTED"
    });
    db.merchantApplication.update.mockResolvedValue({});
    db.user.update.mockResolvedValue({});
    db.store.findFirst.mockResolvedValue(null);
    db.store.create.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.reviewMerchantApplication({
      actorId: "admin-1",
      applicationId: "apply-1",
      action: "approve"
    })).resolves.toContain("店铺已生成");

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-applicant" },
      data: { role: "MERCHANT" }
    });
    expect(db.store.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ownerId: "user-applicant",
        status: "ACTIVE"
      })
    }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "MERCHANT_REVIEW_APPROVE" })
    }));
  });

  it("auto-approves merchant applications when manual review is disabled", async () => {
    const db = createMockDb();
    db.systemSetting.findUnique.mockResolvedValue({ key: "merchantManualReview", value: "auto" });
    db.store.findFirst.mockResolvedValue(null);
    db.merchantApplication.create.mockResolvedValue({});
    db.user.update.mockResolvedValue({});
    db.store.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.submitMerchantApplication({
      userId: "user-applicant",
      storeName: "自动审核店铺",
      categoryId: "cat-digital",
      description: "自动审核后直接生成店铺。",
      licenseImageUrl: "/uploads/license-auto.png"
    })).resolves.toContain("自动通过");

    expect(db.merchantApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-applicant",
        storeName: "自动审核店铺",
        status: "APPROVED"
      })
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-applicant" },
      data: { role: "MERCHANT" }
    });
    expect(db.store.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: "user-applicant",
        status: "ACTIVE"
      })
    });
  });

  it("validates prisma merchant application payloads before database writes", async () => {
    const db = createMockDb();
    const service = new PrismaMallWriteService(db as never);

    await expect(service.submitMerchantApplication({
      userId: "user-applicant",
      storeName: "自动审核店铺",
      categoryId: "cat-digital",
      description: "太短",
      licenseImageUrl: "/uploads/license-auto.png"
    })).rejects.toThrow("店铺介绍至少 8 个字");
    expect(db.store.findFirst).not.toHaveBeenCalled();
    expect(db.merchantApplication.create).not.toHaveBeenCalled();
  });

  it("rejects merchant applications from users that already own a store", async () => {
    const db = createMockDb();
    db.store.findFirst.mockResolvedValue({ id: "store-existing", ownerId: "merchant-1" });
    const service = new PrismaMallWriteService(db as never);

    await expect(service.submitMerchantApplication({
      userId: "merchant-1",
      storeName: "重复开店",
      categoryId: "cat-digital",
      description: "已有店铺时不能再次提交开店申请。",
      licenseImageUrl: "/uploads/license-repeat.png"
    })).rejects.toThrow("当前账号已拥有店铺");

    expect(db.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(db.merchantApplication.create).not.toHaveBeenCalled();
  });

  it("persists the requested home banner status", async () => {
    const db = createMockDb();
    db.homeBanner.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.saveHomeBanner({
      actorId: "admin-1",
      id: "banner-1",
      title: "桌面焕新季",
      subtitle: "精选智能台灯",
      imageUrl: "/banners/desk-refresh.jpg",
      linkUrl: "/?category=数码生活",
      status: "OFFLINE"
    })).resolves.toContain("首页配置已保存");

    expect(db.homeBanner.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "banner-1" },
      data: expect.objectContaining({ status: "OFFLINE" })
    }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        actorId: "admin-1",
        action: "HOME_BANNER_SAVE",
        targetType: "HomeBanner",
        targetId: "banner-1",
        metadata: {
          title: "桌面焕新季",
          status: "OFFLINE"
        }
      })
    }));

    await expect(service.saveHomeBanner({
      id: "banner-1",
      title: "未授权首页",
      imageUrl: "/banners/desk-refresh.jpg",
      linkUrl: "/",
      status: "ONLINE"
    })).rejects.toThrow("只有管理员可以保存首页配置");
  });

  it("updates an explicit system setting value and audits the change", async () => {
    const db = createMockDb();
    db.systemSetting.findUnique.mockResolvedValue({
      key: "memberRegistration",
      value: "enabled"
    });
    db.systemSetting.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateSystemSetting({
      actorId: "admin-1",
      key: "memberRegistration",
      value: "disabled"
    })).resolves.toContain("系统配置已更新");

    expect(db.systemSetting.update).toHaveBeenCalledWith({
      where: { key: "memberRegistration" },
      data: { value: "disabled" }
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "SYSTEM_SETTING_UPDATE",
        metadata: { from: "enabled", to: "disabled" }
      })
    }));
  });

  it("increments home cache version even when the form submits the current value", async () => {
    const db = createMockDb();
    db.systemSetting.findUnique.mockResolvedValue({
      key: "homeCacheVersion",
      value: "7"
    });
    db.systemSetting.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});
    const service = new PrismaMallWriteService(db as never);

    await expect(service.updateSystemSetting({
      actorId: "admin-1",
      key: "homeCacheVersion",
      value: "7"
    })).resolves.toContain("系统配置已更新");

    expect(db.systemSetting.update).toHaveBeenCalledWith({
      where: { key: "homeCacheVersion" },
      data: { value: "8" }
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        targetId: "homeCacheVersion",
        metadata: { from: "7", to: "8" }
      })
    }));
  });
});
