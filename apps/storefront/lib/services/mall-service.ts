import {
  canCreateAfterSale,
  canReviewOrderItem,
  hashPassword,
  isProductPurchasable,
  nextAfterSaleStatus,
  nextMerchantApplicationStatus,
  nextOrderStatusAfterPayment,
  nextOrderStatusAfterReceive,
  nextOrderStatusAfterShipment,
  verifyPassword
} from "@minimal-mall/auth";
import type { AfterSaleType, BannerStatus, OrderStatus, ProductStatus, StoreStatus, UserRole } from "@minimal-mall/types";
import {
  confirmDemoOrderReceive,
  createDemoAfterSale,
  createDemoShipment,
  publishDemoProduct,
  registerDemoCustomer,
  saveDemoCustomerProfile,
  getDemoSystemSetting,
  markDemoOrderItemReviewed,
  retryDemoOrderPayment,
  saveDemoHomeBanner,
  updateDemoAfterSale,
  updateDemoProduct,
  updateDemoProductStatus,
  updateDemoStoreProfile,
  updateDemoStoreStatus,
  updateDemoSystemSetting
} from "../demo-state";
import { makeVirtualTrackingNo } from "../format";

const DEFAULT_CUSTOMER_ID = "user-customer-1";
const DEFAULT_MERCHANT_ID = "merchant-1";
const DEFAULT_ADMIN_ID = "admin-1";

export interface CheckoutInput {
  userId?: string;
  receiver: string;
  phone: string;
  address: string;
  paymentMethod: string;
  productId?: string;
  quantity?: number;
}

export interface AuthResult {
  message: string;
  user: {
    id: string;
    role: UserRole;
    email?: string | null;
    phone?: string | null;
    storeIds?: string[];
  };
}

export interface RegisterInput {
  account: string;
  password: string;
  nickname: string;
  contactPhone: string;
  defaultAddress: string;
}

export interface ReviewInput {
  userId?: string;
  orderItemId: string;
  rating: number;
  content: string;
}

export interface AfterSaleInput {
  userId?: string;
  orderItemId: string;
  type: AfterSaleType;
  reason: string;
  description: string;
  evidenceUrl?: string;
}

export interface MerchantApplicationInput {
  userId: string;
  storeName: string;
  categoryId: string;
  description: string;
  licenseImageUrl: string;
}

export interface ProductInput {
  actorId?: string;
  storeId: string;
  categoryId?: string;
  name: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  description: string;
}

export interface StoreProfileInput {
  actorId?: string;
  storeId: string;
  name: string;
  categoryId: string;
  description: string;
}

export interface ProductUpdateInput extends ProductInput {
  actorId?: string;
  productId: string;
}

export interface HomeBannerInput {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  status: BannerStatus;
}

export interface MallWriteService {
  login(input: { account: string; password: string }): Promise<AuthResult>;
  registerCustomer(input: RegisterInput): Promise<AuthResult>;
  saveProfile(input: { userId?: string; nickname: string; contactPhone: string; defaultAddress: string }): Promise<string>;
  addCartItem(input: { userId?: string; productId?: string; productName: string; stock: number }): Promise<{ message: string; cartDelta: string }>;
  updateCartQuantity(input: { userId?: string; cartItemId: string; quantity: number }): Promise<string>;
  removeCartItem(input: { userId?: string; cartItemId: string }): Promise<string>;
  checkout(input: CheckoutInput): Promise<string>;
  retryPayment(input: { userId?: string; orderNo: string; paymentMethod: string }): Promise<string>;
  confirmReceive(input: { orderNo: string; status: OrderStatus }): Promise<string>;
  submitReview(input: ReviewInput): Promise<string>;
  createAfterSale(input: AfterSaleInput): Promise<string>;
  submitMerchantApplication(input: MerchantApplicationInput): Promise<string>;
  publishProduct(input: ProductInput): Promise<string>;
  updateStoreProfile(input: StoreProfileInput): Promise<string>;
  updateProduct(input: ProductUpdateInput): Promise<string>;
  updateProductStatus(input: { actorId?: string; productId: string; status: ProductStatus }): Promise<string>;
  updateStoreStatus(input: { actorId?: string; storeId: string; status: StoreStatus }): Promise<string>;
  createShipment(input: { actorId?: string; orderNo: string; status: OrderStatus }): Promise<{ message: string; trackingNo: string }>;
  handleAfterSale(input: { actorId?: string; afterSaleId?: string; action: "approve" | "reject"; reply: string }): Promise<string>;
  reviewMerchantApplication(input: { actorId?: string; applicationId?: string; action: "approve" | "reject"; reason?: string }): Promise<string>;
  saveHomeBanner(input: HomeBannerInput): Promise<string>;
  updateSystemSetting(input: { actorId?: string; key: string; value?: string }): Promise<string>;
}

type PrismaClientLike = typeof import("@minimal-mall/db")["prisma"];

let defaultPrismaClient: Promise<PrismaClientLike> | undefined;

async function getDefaultPrismaClient() {
  defaultPrismaClient ??= import("@minimal-mall/db").then(({ prisma }) => prisma);
  return defaultPrismaClient;
}

export class DemoMallWriteService implements MallWriteService {
  async login(input: { account: string; password: string }): Promise<AuthResult> {
    void input.password;
    if (input.account === "admin@example.com") {
      return {
        message: "登录成功，已进入管理员后台",
        user: {
          id: DEFAULT_ADMIN_ID,
          role: "ADMIN",
          email: "admin@example.com"
        }
      };
    }
    if (
      input.account === "review-desktop@example.com" ||
      input.account === "review-mobile@example.com" ||
      input.account === "after-sale-desktop@example.com" ||
      input.account === "after-sale-mobile@example.com" ||
      input.account === "profile-desktop@example.com" ||
      input.account === "profile-mobile@example.com"
    ) {
      const mode = input.account.includes("mobile") ? "mobile" : "desktop";
      const scope = input.account.startsWith("review") ? "review" : input.account.startsWith("after-sale") ? "after-sale" : "profile";
      return {
        message: "登录成功，已进入顾客前台",
        user: {
          id: `user-e2e-${scope}-${mode}`,
          role: "CUSTOMER",
          email: input.account,
          phone: mode === "mobile" ? "13800000012" : "13800000011"
        }
      };
    }
    if (input.account === "merchant@example.com" || input.account === "13800000003") {
      return {
        message: "登录成功，已进入商家中台",
        user: {
          id: DEFAULT_MERCHANT_ID,
          role: "MERCHANT",
          email: "merchant@example.com",
          phone: "13800000003",
          storeIds: ["store-minimal"]
        }
      };
    }
    return {
      message: "登录成功，已进入顾客前台",
      user: {
        id: DEFAULT_CUSTOMER_ID,
        role: "CUSTOMER",
        email: "customer@example.com",
        phone: "13800000001"
      }
    };
  }

  async registerCustomer(input: RegisterInput): Promise<AuthResult> {
    if (getDemoSystemSetting("memberRegistration")?.value === "disabled") {
      throw new Error("会员注册已暂停，请稍后再试");
    }
    const profile = registerDemoCustomer(input);
    return {
      message: "注册成功，已进入顾客前台",
      user: {
        id: profile.id,
        role: "CUSTOMER",
        email: profile.email || null,
        phone: profile.phone
      }
    };
  }

  async saveProfile(input: { userId?: string; nickname: string; contactPhone: string; defaultAddress: string }) {
    saveDemoCustomerProfile(input);
    return "个人资料已保存";
  }

  async addCartItem(input: { userId?: string; productId?: string; productName: string; stock: number }) {
    if (input.stock < 1) throw new Error("库存不足，无法加入购物车");
    return { message: `已加入购物车：${input.productName}`, cartDelta: "1" };
  }

  async updateCartQuantity(input: { userId?: string; cartItemId: string; quantity: number }) {
    void input.userId;
    if (input.quantity < 1) throw new Error("购物车数量不能小于 1");
    return `购物车数量已更新为 ${input.quantity}`;
  }

  async removeCartItem(input: { userId?: string; cartItemId: string }) {
    void input;
    return "购物车商品已删除";
  }

  async checkout(input: CheckoutInput) {
    const paymentSucceeded = input.paymentMethod !== "fail";
    const nextStatus = nextOrderStatusAfterPayment(paymentSucceeded);
    const orderNo = paymentSucceeded ? "MO20260528099" : "MO20260528098";
    return paymentSucceeded
      ? `虚拟支付成功，订单 ${orderNo} 已进入${nextStatus === "TO_SHIP" ? "待发货" : "待支付"}`
      : `虚拟支付失败，订单 ${orderNo} 已保持待支付，可在订单页重试`;
  }

  async retryPayment(input: { userId?: string; orderNo: string; paymentMethod: string }) {
    void input.userId;
    void input.paymentMethod;
    retryDemoOrderPayment(input.orderNo);
    return `虚拟支付成功，订单 ${input.orderNo} 已进入待发货`;
  }

  async confirmReceive(input: { orderNo: string; status: OrderStatus }) {
    confirmDemoOrderReceive(input);
    return `订单 ${input.orderNo} 已确认收货，可提交评价`;
  }

  async submitReview(input: ReviewInput) {
    markDemoOrderItemReviewed(input.orderItemId);
    return "评价已提交，商品评分已更新";
  }

  async createAfterSale(input: AfterSaleInput) {
    createDemoAfterSale(input);
    return "售后申请已提交，商家工作台可见";
  }

  async submitMerchantApplication(input: MerchantApplicationInput) {
    if (getDemoSystemSetting("merchantManualReview")?.value === "auto") {
      void input;
      return "开店申请已自动通过，店铺已生成";
    }
    nextMerchantApplicationStatus("DRAFT", "submit");
    return "开店申请已提交，状态为待审核";
  }

  async publishProduct(input: ProductInput) {
    publishDemoProduct(input);
    return "商品已发布到顾客前台";
  }

  async updateStoreProfile(input: StoreProfileInput) {
    updateDemoStoreProfile(input);
    return "店铺资料已保存";
  }

  async updateProduct(input: ProductUpdateInput) {
    updateDemoProduct(input);
    return "商品资料已保存";
  }

  async updateProductStatus(input: { actorId?: string; productId: string; status: ProductStatus }) {
    updateDemoProductStatus(input);
    return input.status === "OFF_SHELF" ? "商品已下架" : "商品已上架";
  }

  async updateStoreStatus(input: { actorId?: string; storeId: string; status: StoreStatus }) {
    updateDemoStoreStatus(input);
    return input.status === "FROZEN" ? "店铺已冻结" : "店铺已恢复经营";
  }

  async createShipment(input: { actorId?: string; orderNo: string; status: OrderStatus }) {
    const trackingNo = makeVirtualTrackingNo(input.orderNo);
    createDemoShipment({ orderNo: input.orderNo, status: input.status, trackingNo });
    return { message: `虚拟运单已生成：${trackingNo}`, trackingNo };
  }

  async handleAfterSale(input: { actorId?: string; afterSaleId?: string; action: "approve" | "reject"; reply: string }) {
    updateDemoAfterSale(input);
    return input.action === "approve" ? "售后已通过并记录审计日志" : "售后已驳回并记录审计日志";
  }

  async reviewMerchantApplication(input: { actorId?: string; applicationId?: string; action: "approve" | "reject"; reason?: string }) {
    if (input.action === "reject" && !input.reason) {
      throw new Error("驳回必须填写原因");
    }
    nextMerchantApplicationStatus("SUBMITTED", input.action);
    return input.action === "approve" ? "商家审核已通过，店铺已生成" : "商家申请已驳回";
  }

  async saveHomeBanner(input: HomeBannerInput) {
    saveDemoHomeBanner(input);
    return "首页配置已保存，顾客首页展示已更新";
  }

  async updateSystemSetting(input: { actorId?: string; key: string; value?: string }) {
    const setting = getDemoSystemSetting(input.key);
    if (!setting) throw new Error("系统配置项不存在");
    updateDemoSystemSetting(input.key, nextSystemSettingValue(input.key, setting.value, input.value));
    return "系统配置已更新并写入审计日志";
  }
}

function activeUserId(inputUserId?: string) {
  return inputUserId ?? DEFAULT_CUSTOMER_ID;
}

function makeBusinessNo(prefix: "MO" | "PAY") {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0")
  ].join("");
  const suffix = String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
  return `${prefix}${timestamp}${suffix}`;
}

function nextSystemSettingValue(key: string, currentValue: string, requestedValue?: string) {
  if (requestedValue) return requestedValue;
  if (key === "homeCacheVersion") {
    const parsed = Number.parseInt(currentValue, 10);
    return String(Number.isFinite(parsed) ? parsed + 1 : 1);
  }
  if (currentValue === "enabled") return "disabled";
  if (currentValue === "disabled") return "enabled";
  if (currentValue === "required") return "optional";
  if (currentValue === "optional") return "required";
  return currentValue;
}

export class PrismaMallWriteService implements MallWriteService {
  constructor(private readonly db?: PrismaClientLike) {}

  private async getDb() {
    return this.db ?? getDefaultPrismaClient();
  }

  async login(input: { account: string; password: string }) {
    const db = await this.getDb();
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: input.account },
          { phone: input.account }
        ]
      }
    });
    if (!user || user.status !== "ACTIVE") {
      throw new Error("账号不存在或已被冻结");
    }
    if (!(await verifyPassword(input.password, user.passwordHash))) {
      throw new Error("账号或密码错误");
    }
    const message = user.role === "ADMIN"
      ? "登录成功，已进入管理员后台"
      : user.role === "MERCHANT"
        ? "登录成功，已进入商家中台"
        : "登录成功，已进入顾客前台";
    return {
      message,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone
      }
    };
  }

  async registerCustomer(input: RegisterInput) {
    const db = await this.getDb();
    const registrationSetting = await db.systemSetting.findUnique({ where: { key: "memberRegistration" } });
    if (registrationSetting?.value === "disabled") {
      throw new Error("会员注册已暂停，请稍后再试");
    }
    const isEmail = input.account.includes("@");
    const existing = await db.user.findFirst({
      where: {
        OR: [
          isEmail ? { email: input.account } : { phone: input.account },
          { phone: input.contactPhone }
        ]
      }
    });
    if (existing) throw new Error("手机号或邮箱已注册");

    const user = await db.user.create({
      data: {
        email: isEmail ? input.account : null,
        phone: isEmail ? input.contactPhone : input.account,
        passwordHash: await hashPassword(input.password),
        role: "CUSTOMER",
        status: "ACTIVE",
        customerProfile: {
          create: {
            nickname: input.nickname,
            contactPhone: input.contactPhone,
            defaultAddress: input.defaultAddress
          }
        }
      }
    });
    return {
      message: "注册成功，已进入顾客前台",
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone
      }
    };
  }

  async saveProfile(input: { userId?: string; nickname: string; contactPhone: string; defaultAddress: string }) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("当前用户不存在，无法保存资料");

    await db.customerProfile.upsert({
      where: { userId },
      update: {
        nickname: input.nickname,
        contactPhone: input.contactPhone,
        defaultAddress: input.defaultAddress
      },
      create: {
        userId,
        nickname: input.nickname,
        contactPhone: input.contactPhone,
        defaultAddress: input.defaultAddress
      }
    });
    return "个人资料已保存";
  }

  async addCartItem(input: { userId?: string; productId?: string; productName: string; stock: number }) {
    if (input.stock < 1) throw new Error("库存不足，无法加入购物车");
    const db = await this.getDb();
    const userId = activeUserId(input.userId);

    const result = await db.$transaction(async (tx) => {
      const product = input.productId
        ? await tx.product.findUnique({ where: { id: input.productId }, include: { store: true } })
        : await tx.product.findFirst({ where: { name: input.productName }, include: { store: true } });
      if (!product) throw new Error("商品不存在，无法加入购物车");
      if (!isProductPurchasable({
        status: product.status,
        stock: product.stock,
        storeStatus: product.store.status
      })) {
        throw new Error("库存不足或店铺冻结，无法加入购物车");
      }

      const existing = await tx.cartItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: product.id
          }
        }
      });
      if (existing && existing.quantity >= product.stock) {
        throw new Error("购物车数量已达到库存上限");
      }

      await tx.cartItem.upsert({
        where: {
          userId_productId: {
            userId,
            productId: product.id
          }
        },
        update: { quantity: { increment: 1 } },
        create: {
          userId,
          productId: product.id,
          quantity: 1
        }
      });

      return product.name;
    });

    return { message: `已加入购物车：${result}`, cartDelta: "1" };
  }

  async updateCartQuantity(input: { userId?: string; cartItemId: string; quantity: number }) {
    if (input.quantity < 1) throw new Error("购物车数量不能小于 1");
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const line = await db.cartItem.findUnique({
      where: { id: input.cartItemId },
      include: { product: true }
    });
    if (!line || line.userId !== userId) throw new Error("购物车商品不存在或无权修改");
    if (line.product.stock < 1) throw new Error("商品已缺货，无法修改数量");
    if (input.quantity > line.product.stock) throw new Error("购物车数量不能超过库存");

    await db.cartItem.update({
      where: { id: input.cartItemId },
      data: { quantity: input.quantity }
    });
    return `购物车数量已更新为 ${input.quantity}`;
  }

  async removeCartItem(input: { userId?: string; cartItemId: string }) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const line = await db.cartItem.findUnique({
      where: { id: input.cartItemId },
      include: { product: true }
    });
    if (!line || line.userId !== userId) throw new Error("购物车商品不存在或无权删除");

    await db.cartItem.delete({
      where: { id: input.cartItemId }
    });
    return `已删除购物车商品：${line.product.name}`;
  }

  async checkout(input: CheckoutInput) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const orderNo = makeBusinessNo("MO");
    const paymentNo = makeBusinessNo("PAY");
    const paymentSucceeded = input.paymentMethod !== "fail";
    const nextStatus = nextOrderStatusAfterPayment(paymentSucceeded);
    const directProductId = input.productId?.trim();
    const directQuantity = input.quantity ?? 1;

    const createdOrder = await db.$transaction(async (tx) => {
      if (directProductId && (!Number.isInteger(directQuantity) || directQuantity < 1)) {
        throw new Error("购买数量必须大于 0");
      }

      const checkoutItems = directProductId
        ? await (async () => {
          const product = await tx.product.findUnique({
            where: { id: directProductId },
            include: { store: true }
          });
          if (!product) throw new Error("商品不存在，无法立即购买");
          return [{
            productId: product.id,
            quantity: directQuantity,
            product
          }];
        })()
        : await tx.cartItem.findMany({
          where: { userId },
          include: {
            product: {
              include: { store: true }
            }
          }
        });
      if (checkoutItems.length === 0) throw new Error("购物车为空，无法结算");

      for (const line of checkoutItems) {
        if (!isProductPurchasable({
          status: line.product.status,
          stock: line.product.stock,
          storeStatus: line.product.store.status
        }) || line.quantity > line.product.stock) {
          throw new Error(`商品 ${line.product.name} 库存不足，无法结算`);
        }
      }

      const totalAmountCents = checkoutItems.reduce(
        (sum, line) => sum + line.product.priceCents * line.quantity,
        0
      );

      const order = await tx.order.create({
        data: {
          userId,
          orderNo,
          status: nextStatus,
          totalAmountCents,
          addressSnapshot: `${input.receiver}，${input.phone}，${input.address}`,
          items: {
            create: checkoutItems.map((line) => ({
              productId: line.productId,
              storeId: line.product.storeId,
              priceCents: line.product.priceCents,
              quantity: line.quantity,
              status: nextStatus
            }))
          },
          payments: {
            create: {
              paymentNo,
              method: input.paymentMethod,
              amountCents: totalAmountCents,
              status: paymentSucceeded ? "SUCCESS" : "FAILED"
            }
          }
        }
      });

      if (paymentSucceeded) {
        for (const line of checkoutItems) {
          const updateData = line.product.stock === line.quantity
            ? { stock: { decrement: line.quantity }, status: "SOLD_OUT" as const }
            : { stock: { decrement: line.quantity } };
          await tx.product.update({
            where: { id: line.productId },
            data: updateData
          });
        }
      }

      if (!directProductId) {
        await tx.cartItem.deleteMany({ where: { userId } });
      }
      return order;
    });

    return paymentSucceeded
      ? `虚拟支付成功，订单 ${createdOrder.orderNo} 已进入${createdOrder.status === "TO_SHIP" ? "待发货" : "待支付"}`
      : `虚拟支付失败，订单 ${createdOrder.orderNo} 已保持待支付，可在订单页重试`;
  }

  async retryPayment(input: { userId?: string; orderNo: string; paymentMethod: string }) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const paymentNo = makeBusinessNo("PAY");
    const nextStatus = nextOrderStatusAfterPayment(true);

    const updatedOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderNo: input.orderNo },
        include: {
          items: {
            include: {
              product: {
                include: { store: true }
              }
            }
          }
        }
      });
      if (!order) throw new Error("订单不存在，无法继续支付");
      if (order.userId !== userId) throw new Error("只能支付自己的订单");
      if (order.status !== "PENDING_PAYMENT") throw new Error("只有待支付订单可以继续支付");
      if (order.items.length === 0) throw new Error("订单没有商品，无法继续支付");

      for (const line of order.items) {
        if (!isProductPurchasable({
          status: line.product.status,
          stock: line.product.stock,
          storeStatus: line.product.store.status
        }) || line.quantity > line.product.stock) {
          throw new Error(`商品 ${line.product.name} 库存不足，无法继续支付`);
        }
      }

      for (const line of order.items) {
        const updateData = line.product.stock === line.quantity
          ? { stock: { decrement: line.quantity }, status: "SOLD_OUT" as const }
          : { stock: { decrement: line.quantity } };
        await tx.product.update({
          where: { id: line.productId },
          data: updateData
        });
      }

      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: nextStatus }
      });
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus }
      });
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentNo,
          method: input.paymentMethod,
          amountCents: order.totalAmountCents,
          status: "SUCCESS"
        }
      });
      return updated;
    });

    return `虚拟支付成功，订单 ${updatedOrder.orderNo} 已进入待发货`;
  }

  async confirmReceive(input: { orderNo: string; status: OrderStatus }) {
    const db = await this.getDb();
    const nextStatus = nextOrderStatusAfterReceive(input.status);
    const order = await db.order.findUnique({ where: { orderNo: input.orderNo } });
    if (!order) throw new Error("订单不存在，无法确认收货");
    if (order.status !== input.status) throw new Error("订单状态已变化，请刷新后重试");

    await db.$transaction([
      db.order.update({
        where: { orderNo: input.orderNo },
        data: { status: nextStatus }
      }),
      db.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: nextStatus }
      }),
      db.shipment.updateMany({
        where: { orderId: order.id },
        data: { status: "DELIVERED" }
      })
    ]);
    return `订单 ${input.orderNo} 已确认收货，可提交评价`;
  }

  async submitReview(input: ReviewInput) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const orderItem = await db.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: {
        order: true,
        product: true,
        review: true
      }
    });
    if (!orderItem) throw new Error("订单商品不存在，无法评价");
    if (orderItem.order.userId !== userId) throw new Error("只能评价自己的订单");
    if (!canReviewOrderItem(orderItem.order.status, Boolean(orderItem.review))) {
      throw new Error("只有已收货且未评价的订单商品可以评价");
    }

    await db.$transaction([
      db.review.create({
        data: {
          userId,
          productId: orderItem.productId,
          orderItemId: orderItem.id,
          rating: input.rating,
          content: input.content
        }
      }),
      db.orderItem.update({
        where: { id: orderItem.id },
        data: { status: "COMPLETED" }
      }),
      db.order.update({
        where: { id: orderItem.orderId },
        data: { status: "COMPLETED" }
      })
    ]);
    return "评价已提交，商品评分已更新";
  }

  async createAfterSale(input: AfterSaleInput) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const orderItem = await db.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: {
        order: true,
        afterSales: true
      }
    });
    if (!orderItem) throw new Error("订单商品不存在，无法申请售后");
    if (orderItem.order.userId !== userId) throw new Error("只能为自己的订单申请售后");
    if (!canCreateAfterSale(orderItem.order.status)) {
      throw new Error("当前订单状态不支持售后申请");
    }
    if (orderItem.afterSales.some((item) => !["REJECTED", "CLOSED"].includes(item.status))) {
      throw new Error("该订单商品已有售后处理中");
    }

    await db.$transaction([
      db.afterSaleRequest.create({
        data: {
          userId,
          orderItemId: orderItem.id,
          type: input.type,
          reason: input.reason,
          description: input.description,
          evidenceUrl: input.evidenceUrl || null,
          status: "REQUESTED"
        }
      }),
      db.orderItem.update({
        where: { id: orderItem.id },
        data: { status: "AFTER_SALE" }
      }),
      db.order.update({
        where: { id: orderItem.orderId },
        data: { status: "AFTER_SALE" }
      })
    ]);
    return "售后申请已提交，商家工作台可见";
  }

  async submitMerchantApplication(input: MerchantApplicationInput) {
    const db = await this.getDb();
    const reviewSetting = await db.systemSetting.findUnique({ where: { key: "merchantManualReview" } });
    if (reviewSetting?.value === "auto") {
      const existingStore = await db.store.findFirst({
        where: { ownerId: input.userId }
      });
      if (existingStore) throw new Error("当前账号已拥有店铺");

      await db.$transaction(async (tx) => {
        await tx.merchantApplication.create({
          data: {
            userId: input.userId,
            storeName: input.storeName,
            categoryId: input.categoryId,
            description: input.description,
            licenseImageUrl: input.licenseImageUrl,
            status: "APPROVED",
            reviewedAt: new Date()
          }
        });
        await tx.user.update({
          where: { id: input.userId },
          data: { role: "MERCHANT" }
        });
        await tx.store.create({
          data: {
            ownerId: input.userId,
            categoryId: input.categoryId,
            name: input.storeName,
            description: input.description,
            status: "ACTIVE"
          }
        });
      });
      return "开店申请已自动通过，店铺已生成";
    }

    const existing = await db.merchantApplication.findFirst({
      where: {
        userId: input.userId,
        status: "SUBMITTED"
      }
    });
    if (existing) throw new Error("已有待审核开店申请，请等待管理员处理");

    await db.merchantApplication.create({
      data: {
        userId: input.userId,
        storeName: input.storeName,
        categoryId: input.categoryId,
        description: input.description,
        licenseImageUrl: input.licenseImageUrl,
        status: nextMerchantApplicationStatus("DRAFT", "submit")
      }
    });
    return "开店申请已提交，状态为待审核";
  }

  async publishProduct(input: ProductInput) {
    const db = await this.getDb();
    const store = await db.store.findUnique({ where: { id: input.storeId } });
    if (!store) throw new Error("店铺不存在，无法发布商品");
    if (input.actorId && store.ownerId !== input.actorId) throw new Error("只能维护自己的店铺");
    if (store.status !== "ACTIVE") throw new Error("店铺已冻结，无法发布新商品");

    await db.product.create({
      data: {
        storeId: input.storeId,
        categoryId: input.categoryId ?? store.categoryId,
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        stock: input.stock,
        status: input.stock > 0 ? "ACTIVE" : "SOLD_OUT",
        images: {
          create: {
            url: input.imageUrl,
            sortOrder: 1
          }
        }
      }
    });
    return "商品已发布到顾客前台";
  }

  async updateStoreProfile(input: StoreProfileInput) {
    const db = await this.getDb();
    const store = await db.store.findUnique({ where: { id: input.storeId } });
    if (!store) throw new Error("店铺不存在，无法保存资料");
    if (input.actorId && store.ownerId !== input.actorId) throw new Error("只能维护自己的店铺");

    await db.store.update({
      where: { id: input.storeId },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        description: input.description
      }
    });
    return "店铺资料已保存";
  }

  async updateProduct(input: ProductUpdateInput) {
    const db = await this.getDb();
    const product = await db.product.findUnique({
      where: { id: input.productId },
      include: { store: true, images: { orderBy: { sortOrder: "asc" } } }
    });
    if (!product) throw new Error("商品不存在，无法保存");
    if (input.actorId && product.store.ownerId !== input.actorId) throw new Error("只能编辑自己店铺的商品");
    if (product.store.status !== "ACTIVE") throw new Error("店铺已冻结，无法编辑商品");

    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: input.productId },
        data: {
          categoryId: input.categoryId ?? product.categoryId,
          name: input.name,
          description: input.description,
          priceCents: input.priceCents,
          stock: input.stock,
          status: input.stock > 0 ? "ACTIVE" : "SOLD_OUT"
        }
      });
      const existingImage = product.images[0];
      if (existingImage) {
        await tx.productImage.update({
          where: { id: existingImage.id },
          data: { url: input.imageUrl }
        });
      } else {
        await tx.productImage.create({
          data: {
            productId: input.productId,
            url: input.imageUrl,
            sortOrder: 1
          }
        });
      }
    });
    return "商品资料已保存";
  }

  async updateProductStatus(input: { actorId?: string; productId: string; status: ProductStatus }) {
    const db = await this.getDb();
    const product = await db.product.findUnique({
      where: { id: input.productId },
      include: { store: true }
    });
    if (!product) throw new Error("商品不存在，无法修改状态");
    if (input.actorId && product.store.ownerId !== input.actorId) throw new Error("只能管理自己店铺的商品");
    if (product.store.status !== "ACTIVE" && input.status === "ACTIVE") throw new Error("店铺已冻结，商品不能上架");
    if (input.status === "ACTIVE" && product.stock < 1) throw new Error("库存不足，商品不能上架");

    await db.product.update({
      where: { id: input.productId },
      data: { status: input.status }
    });
    return input.status === "OFF_SHELF" ? "商品已下架" : "商品已上架";
  }

  async updateStoreStatus(input: { actorId?: string; storeId: string; status: StoreStatus }) {
    if (!input.actorId) throw new Error("只有管理员可以修改店铺状态");
    const db = await this.getDb();
    const store = await db.store.findUnique({ where: { id: input.storeId } });
    if (!store) throw new Error("店铺不存在，无法修改状态");

    await db.$transaction(async (tx) => {
      await tx.store.update({
        where: { id: input.storeId },
        data: { status: input.status }
      });
      if (input.status === "FROZEN") {
        await tx.product.updateMany({
          where: { storeId: input.storeId, status: "ACTIVE" },
          data: { status: "OFF_SHELF" }
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.status === "FROZEN" ? "STORE_FREEZE" : "STORE_ACTIVATE",
          targetType: "Store",
          targetId: input.storeId,
          metadata: { status: input.status },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
    });
    return input.status === "FROZEN" ? "店铺已冻结" : "店铺已恢复经营";
  }

  async createShipment(input: { actorId?: string; orderNo: string; status: OrderStatus }) {
    const db = await this.getDb();
    const order = await db.order.findUnique({
      where: { orderNo: input.orderNo },
      include: {
        items: { include: { store: true } },
        shipments: true
      }
    });
    if (!order) throw new Error("订单不存在，无法生成运单");
    if (order.status !== input.status) throw new Error("订单状态已变化，请刷新后重试");
    if (order.shipments.length > 0) throw new Error("该订单已有有效运单");

    const nextStatus = nextOrderStatusAfterShipment(input.status);
    const firstItem = order.items[0];
    if (!firstItem) throw new Error("订单没有商品，无法生成运单");
    if (input.actorId && firstItem.store.ownerId !== input.actorId) {
      throw new Error("只能为自己店铺的订单生成运单");
    }
    const trackingNo = makeVirtualTrackingNo(input.orderNo);

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus }
      });
      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: nextStatus }
      });
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          storeId: firstItem.storeId,
          trackingNo,
          status: "IN_TRANSIT",
          events: {
            create: [
              { title: "已发货", description: "商家已生成虚拟运单。" },
              { title: "运输中", description: "包裹已进入南昌分拨中心。" },
              { title: "待确认收货", description: "预计今日送达。" }
            ]
          }
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: input.actorId ?? DEFAULT_MERCHANT_ID,
          action: "CREATE_SHIPMENT",
          targetType: "Order",
          targetId: order.id,
          metadata: { trackingNo, shipmentId: shipment.id },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
    });

    return { message: `虚拟运单已生成：${trackingNo}`, trackingNo };
  }

  async handleAfterSale(input: { actorId?: string; afterSaleId?: string; action: "approve" | "reject"; reply: string }) {
    const db = await this.getDb();
    const request = input.afterSaleId
      ? await db.afterSaleRequest.findUnique({
        where: { id: input.afterSaleId },
        include: { orderItem: { include: { store: true } } }
      })
      : await db.afterSaleRequest.findFirst({
        where: { status: "REQUESTED" },
        include: { orderItem: { include: { store: true } } }
      });
    if (!request) throw new Error("售后申请不存在或已处理");
    if (input.actorId && request.orderItem.store.ownerId !== input.actorId) {
      throw new Error("只能处理自己店铺的售后申请");
    }

    const nextStatus = nextAfterSaleStatus(request.status, input.action);
    await db.$transaction(async (tx) => {
      await tx.afterSaleRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          merchantReply: input.reply
        }
      });
      if (nextStatus === "REJECTED") {
        await tx.orderItem.update({
          where: { id: request.orderItemId },
          data: { status: "DELIVERED" }
        });
        await tx.order.update({
          where: { id: request.orderItem.orderId },
          data: { status: "DELIVERED" }
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: input.actorId ?? DEFAULT_MERCHANT_ID,
          action: input.action === "approve" ? "AFTER_SALE_APPROVE" : "AFTER_SALE_REJECT",
          targetType: "AfterSaleRequest",
          targetId: request.id,
          metadata: { reply: input.reply, status: nextStatus },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
    });

    return input.action === "approve" ? "售后已通过并记录审计日志" : "售后已驳回并记录审计日志";
  }

  async reviewMerchantApplication(input: { actorId?: string; applicationId?: string; action: "approve" | "reject"; reason?: string }) {
    const db = await this.getDb();
    if (input.action === "reject" && !input.reason) {
      throw new Error("驳回必须填写原因");
    }
    const application = input.applicationId
      ? await db.merchantApplication.findUnique({ where: { id: input.applicationId } })
      : await db.merchantApplication.findFirst({ where: { status: "SUBMITTED" } });
    if (!application) throw new Error("商家申请不存在或已处理");
    if (application.status !== "SUBMITTED") throw new Error("只有待审核申请可以处理");

    const nextStatus = nextMerchantApplicationStatus("SUBMITTED", input.action);
    await db.$transaction(async (tx) => {
      await tx.merchantApplication.update({
        where: { id: application.id },
        data: {
          status: nextStatus,
          reviewReason: input.action === "reject" ? input.reason : null,
          reviewedAt: new Date()
        }
      });
      if (input.action === "approve") {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: "MERCHANT" }
        });
        const existingStore = await tx.store.findFirst({
          where: { ownerId: application.userId }
        });
        if (!existingStore) {
          await tx.store.create({
            data: {
              ownerId: application.userId,
              categoryId: application.categoryId,
              name: application.storeName,
              description: application.description,
              status: "ACTIVE"
            }
          });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: input.actorId ?? DEFAULT_ADMIN_ID,
          action: input.action === "approve" ? "MERCHANT_REVIEW_APPROVE" : "MERCHANT_REVIEW_REJECT",
          targetType: "MerchantApplication",
          targetId: application.id,
          metadata: { reason: input.reason ?? "", status: nextStatus },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
    });

    return input.action === "approve" ? "商家审核已通过，店铺已生成" : "商家申请已驳回";
  }

  async saveHomeBanner(input: HomeBannerInput) {
    const db = await this.getDb();
    if (input.id) {
      await db.homeBanner.update({
        where: { id: input.id },
        data: {
          title: input.title,
          subtitle: input.subtitle ?? "",
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl,
          status: input.status
        }
      });
    } else {
      await db.homeBanner.create({
        data: {
          title: input.title,
          subtitle: input.subtitle ?? "",
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl,
          status: input.status,
          sortOrder: 1
        }
      });
    }
    return "首页配置已保存，顾客首页展示已更新";
  }

  async updateSystemSetting(input: { actorId?: string; key: string; value?: string }) {
    const db = await this.getDb();
    const setting = await db.systemSetting.findUnique({ where: { key: input.key } });
    if (!setting) throw new Error("系统配置项不存在");
    const nextValue = nextSystemSettingValue(input.key, setting.value, input.value);

    await db.$transaction([
      db.systemSetting.update({
        where: { key: input.key },
        data: { value: nextValue }
      }),
      db.auditLog.create({
        data: {
          actorId: input.actorId ?? DEFAULT_ADMIN_ID,
          action: "SYSTEM_SETTING_UPDATE",
          targetType: "SystemSetting",
          targetId: input.key,
          metadata: { from: setting.value, to: nextValue },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      })
    ]);
    return "系统配置已更新并写入审计日志";
  }
}

export function getMallWriteService(): MallWriteService {
  if (process.env.MALL_WRITE_MODE === "prisma") {
    return new PrismaMallWriteService();
  }
  return new DemoMallWriteService();
}
