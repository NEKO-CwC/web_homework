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
  addDemoCartLine,
  appendDemoAuditLog,
  confirmDemoOrderReceive,
  createDemoAfterSale,
  createDemoCheckoutOrder,
  createDemoMerchantApplication,
  createDemoShipment,
  createDemoStore,
  findDemoCustomerProfileByAccount,
  listDemoStores,
  publishDemoProduct,
  registerDemoCustomer,
  removeDemoCartLine,
  saveDemoCustomerProfile,
  getDemoSystemSetting,
  markDemoOrderItemReviewed,
  retryDemoOrderPayment,
  saveDemoHomeBanner,
  updateDemoAfterSale,
  updateDemoCartQuantity,
  updateDemoMerchantApplication,
  updateDemoProduct,
  updateDemoProductStatus,
  updateDemoStoreProfile,
  updateDemoStoreStatus,
  updateDemoSystemSetting
} from "../demo-state";
import { checkoutTotalCents, makeVirtualTrackingNo } from "../format";

const DEFAULT_CUSTOMER_ID = "user-customer-1";
const DEFAULT_MERCHANT_ID = "merchant-1";
const DEFAULT_ADMIN_ID = "admin-1";
const DEMO_PASSWORD = "12345678";

function assertDemoPassword(password: string, storedHash?: string) {
  if (storedHash) return verifyPassword(password, storedHash);
  return Promise.resolve(password === DEMO_PASSWORD);
}

function validateProductInput(input: ProductInput) {
  if (input.name.trim().length < 2) throw new Error("商品名称至少 2 个字");
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) throw new Error("商品价格必须大于 0");
  if (!Number.isInteger(input.stock) || input.stock < 0) throw new Error("商品库存必须是非负整数");
  if (!input.imageUrl.trim()) throw new Error("请提供商品图片");
  if (input.description.trim().length < 8) throw new Error("商品介绍至少 8 个字");
}

function validateCustomerProfile(input: { nickname: string; contactPhone: string; defaultAddress: string }) {
  if (!input.nickname.trim()) throw new Error("昵称不能为空");
  if (input.contactPhone.trim().length < 6) throw new Error("联系电话不能为空");
  if (input.defaultAddress.trim().length < 8) throw new Error("默认地址至少 8 个字");
}

function validateRegisterInput(input: RegisterInput) {
  if (!input.account.trim()) throw new Error("请输入手机号或邮箱");
  if (input.password.length < 6) throw new Error("密码至少 6 位");
  validateCustomerProfile(input);
}

function validateMerchantApplicationInput(input: MerchantApplicationInput) {
  if (input.storeName.trim().length < 2) throw new Error("店铺名称至少 2 个字");
  if (!input.categoryId.trim()) throw new Error("请选择经营类目");
  if (input.description.trim().length < 8) throw new Error("店铺介绍至少 8 个字");
  if (!input.licenseImageUrl.trim()) throw new Error("请上传或填写资质图片");
}

function validateStoreProfileInput(input: StoreProfileInput) {
  if (input.name.trim().length < 2) throw new Error("店铺名称至少 2 个字");
  if (!input.categoryId.trim()) throw new Error("请选择经营类目");
  if (input.description.trim().length < 8) throw new Error("店铺介绍至少 8 个字");
}

function validateCheckoutInput(input: CheckoutInput) {
  if (!input.receiver.trim()) throw new Error("请输入收货人");
  if (input.phone.trim().length < 6) throw new Error("请输入联系电话");
  if (input.address.trim().length < 8) throw new Error("请输入完整收货地址");
  if (!input.paymentMethod.trim()) throw new Error("请选择虚拟支付方式");
  if (input.productId && (!Number.isInteger(input.quantity ?? 1) || (input.quantity ?? 1) < 1)) {
    throw new Error("购买数量必须大于 0");
  }
}

function validatePaymentRetryInput(input: { orderNo: string; paymentMethod: string }) {
  if (!input.orderNo.trim()) throw new Error("缺少订单号");
  if (!input.paymentMethod.trim()) throw new Error("请选择虚拟支付方式");
}

function validateReviewInput(input: ReviewInput) {
  if (!input.orderItemId.trim()) throw new Error("请选择订单");
  if (!Number.isFinite(input.rating) || input.rating < 1) throw new Error("评分至少 1 分");
  if (input.rating > 5) throw new Error("评分最高 5 分");
  if (input.content.trim().length < 4) throw new Error("评价内容至少 4 个字");
}

function validateAfterSaleInput(input: AfterSaleInput) {
  if (!input.orderItemId.trim()) throw new Error("请选择订单商品");
  if (!["REFUND", "RETURN_REFUND", "EXCHANGE"].includes(input.type)) throw new Error("请选择售后类型");
  if (input.reason.trim().length < 2) throw new Error("请选择或填写原因");
  if (input.description.trim().length < 4) throw new Error("说明至少 4 个字");
}

function validateShipmentInput(input: { orderNo: string; status: OrderStatus }) {
  if (!input.orderNo.trim()) throw new Error("缺少订单号");
  if (input.status !== "TO_SHIP") throw new Error("只有待发货订单可以生成运单");
}

function validateAfterSaleDecisionInput(input: { action: string; reply: string }) {
  if (!["approve", "reject"].includes(input.action)) throw new Error("售后处理动作不合法");
  if (!input.reply.trim()) throw new Error("请填写处理说明");
}

function validateMerchantReviewInput(input: { action: string; reason?: string }) {
  if (!["approve", "reject"].includes(input.action)) throw new Error("商家审核动作不合法");
  if (input.action === "reject" && !input.reason?.trim()) throw new Error("驳回必须填写原因");
}

function validateHomeBannerInput(input: HomeBannerInput) {
  if (input.title.trim().length < 2) throw new Error("Banner 标题不能为空");
  if (!input.imageUrl.trim()) throw new Error("请提供 Banner 图片");
  if (!input.linkUrl.trim()) throw new Error("请提供跳转链接");
  if (!["ONLINE", "OFFLINE"].includes(input.status)) throw new Error("Banner 状态不合法");
}

function validateSystemSettingInput(input: { key: string; value?: string }) {
  if (!input.key.trim()) throw new Error("缺少配置项");
  if (input.key === "memberRegistration" && input.value && !["enabled", "disabled"].includes(input.value)) {
    throw new Error("会员注册配置值不合法");
  }
  if (input.key === "merchantManualReview" && input.value && !["required", "auto"].includes(input.value)) {
    throw new Error("商家入驻审核配置值不合法");
  }
}

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

export interface MerchantApplicationResult {
  message: string;
  promotedUser?: AuthResult["user"];
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
  actorId?: string;
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
  confirmReceive(input: { userId?: string; orderNo: string; status: OrderStatus }): Promise<string>;
  submitReview(input: ReviewInput): Promise<string>;
  createAfterSale(input: AfterSaleInput): Promise<string>;
  submitMerchantApplication(input: MerchantApplicationInput): Promise<MerchantApplicationResult>;
  publishProduct(input: ProductInput): Promise<string>;
  updateStoreProfile(input: StoreProfileInput): Promise<string>;
  updateProduct(input: ProductUpdateInput): Promise<string>;
  updateProductStatus(input: { actorId?: string; productId: string; status: ProductStatus }): Promise<string>;
  updateStoreStatus(input: { actorId?: string; storeId: string; status: StoreStatus }): Promise<string>;
  createShipment(input: { actorId?: string; storeId?: string; orderNo: string; status: OrderStatus }): Promise<{ message: string; trackingNo: string }>;
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
    if (input.account === "admin@example.com") {
      if (!(await assertDemoPassword(input.password))) throw new Error("账号或密码错误");
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
      if (!(await assertDemoPassword(input.password))) throw new Error("账号或密码错误");
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
      if (!(await assertDemoPassword(input.password))) throw new Error("账号或密码错误");
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
    const customer = findDemoCustomerProfileByAccount(input.account);
    if (!customer || !(await assertDemoPassword(input.password, customer.passwordHash))) {
      throw new Error("账号或密码错误");
    }
    const ownedStores = listDemoStores().filter((store) => store.ownerId === customer.id);
    const isMerchant = ownedStores.length > 0;
    return {
      message: isMerchant ? "登录成功，已进入商家中台" : "登录成功，已进入顾客前台",
      user: {
        id: customer.id,
        role: isMerchant ? "MERCHANT" : "CUSTOMER",
        email: customer.email,
        phone: customer.phone,
        storeIds: ownedStores.map((store) => store.id)
      }
    };
  }

  async registerCustomer(input: RegisterInput): Promise<AuthResult> {
    validateRegisterInput(input);
    if (getDemoSystemSetting("memberRegistration")?.value === "disabled") {
      throw new Error("会员注册已暂停，请稍后再试");
    }
    const profile = registerDemoCustomer({
      ...input,
      passwordHash: await hashPassword(input.password)
    });
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
    validateCustomerProfile(input);
    saveDemoCustomerProfile(input);
    return "个人资料已保存";
  }

  async addCartItem(input: { userId?: string; productId?: string; productName: string; stock: number }) {
    if (input.stock < 1) throw new Error("库存不足，无法加入购物车");
    const result = addDemoCartLine({
      userId: input.userId,
      productId: input.productId,
      productName: input.productName
    });
    return { message: `已加入购物车：${result.productName}`, cartDelta: result.cartDelta };
  }

  async updateCartQuantity(input: { userId?: string; cartItemId: string; quantity: number }) {
    if (input.quantity < 1) throw new Error("购物车数量不能小于 1");
    updateDemoCartQuantity(input);
    return `购物车数量已更新为 ${input.quantity}`;
  }

  async removeCartItem(input: { userId?: string; cartItemId: string }) {
    const result = removeDemoCartLine(input);
    return `已删除购物车商品：${result.productName}`;
  }

  async checkout(input: CheckoutInput) {
    validateCheckoutInput(input);
    const paymentSucceeded = input.paymentMethod !== "fail";
    const order = createDemoCheckoutOrder(input);
    return paymentSucceeded
      ? `虚拟支付成功，订单 ${order.orderNo} 已进入${order.status === "TO_SHIP" ? "待发货" : "待支付"}`
      : `虚拟支付失败，订单 ${order.orderNo} 已保持待支付，可在订单页重试`;
  }

  async retryPayment(input: { userId?: string; orderNo: string; paymentMethod: string }) {
    validatePaymentRetryInput(input);
    void input.paymentMethod;
    retryDemoOrderPayment({ orderNo: input.orderNo, userId: input.userId });
    return `虚拟支付成功，订单 ${input.orderNo} 已进入待发货`;
  }

  async confirmReceive(input: { userId?: string; orderNo: string; status: OrderStatus }) {
    confirmDemoOrderReceive(input);
    return `订单 ${input.orderNo} 已确认收货，可提交评价`;
  }

  async submitReview(input: ReviewInput) {
    validateReviewInput(input);
    markDemoOrderItemReviewed({
      userId: input.userId,
      orderItemId: input.orderItemId,
      rating: input.rating,
      content: input.content
    });
    return "评价已提交，商品评分已更新";
  }

  async createAfterSale(input: AfterSaleInput) {
    validateAfterSaleInput(input);
    createDemoAfterSale(input);
    return "售后申请已提交，商家工作台可见";
  }

  async submitMerchantApplication(input: MerchantApplicationInput): Promise<MerchantApplicationResult> {
    validateMerchantApplicationInput(input);
    if (listDemoStores().some((store) => store.ownerId === input.userId)) {
      throw new Error("当前账号已拥有店铺");
    }
    if (getDemoSystemSetting("merchantManualReview")?.value === "auto") {
      const store = createDemoStore({
        ownerId: input.userId,
        categoryId: input.categoryId,
        name: input.storeName,
        description: input.description
      });
      return {
        message: "开店申请已自动通过，店铺已生成",
        promotedUser: {
          id: input.userId,
          role: "MERCHANT",
          storeIds: [store.id]
        }
      };
    }
    createDemoMerchantApplication(input);
    return { message: "开店申请已提交，状态为待审核" };
  }

  async publishProduct(input: ProductInput) {
    validateProductInput(input);
    publishDemoProduct(input);
    return "商品已发布到顾客前台";
  }

  async updateStoreProfile(input: StoreProfileInput) {
    validateStoreProfileInput(input);
    updateDemoStoreProfile(input);
    return "店铺资料已保存";
  }

  async updateProduct(input: ProductUpdateInput) {
    validateProductInput(input);
    updateDemoProduct(input);
    return "商品资料已保存";
  }

  async updateProductStatus(input: { actorId?: string; productId: string; status: ProductStatus }) {
    updateDemoProductStatus(input);
    return input.status === "OFF_SHELF" ? "商品已下架" : "商品已上架";
  }

  async updateStoreStatus(input: { actorId?: string; storeId: string; status: StoreStatus }) {
    const current = listDemoStores().find((store) => store.id === input.storeId);
    if (current?.status === input.status) {
      appendDemoAuditLog({
        actorId: input.actorId,
        actorRole: "ADMIN",
        action: "STORE_REVIEW",
        targetType: "Store",
        targetId: input.storeId,
        metadata: { status: input.status, reviewedOnly: true }
      });
      return "店铺复核完成，状态未变化";
    }
    updateDemoStoreStatus(input);
    appendDemoAuditLog({
      actorId: input.actorId,
      actorRole: "ADMIN",
      action: input.status === "FROZEN" ? "STORE_FREEZE" : "STORE_ACTIVATE",
      targetType: "Store",
      targetId: input.storeId,
      metadata: { status: input.status, reviewedOnly: false }
    });
    return input.status === "FROZEN" ? "店铺已冻结" : "店铺已恢复经营";
  }

  async createShipment(input: { actorId?: string; storeId?: string; orderNo: string; status: OrderStatus }) {
    validateShipmentInput(input);
    const trackingNo = makeVirtualTrackingNo(input.orderNo);
    const order = createDemoShipment({ orderNo: input.orderNo, status: input.status, storeId: input.storeId, trackingNo });
    appendDemoAuditLog({
      actorId: input.actorId,
      actorRole: "MERCHANT",
      action: "CREATE_SHIPMENT",
      targetType: "Order",
      targetId: order.id,
      metadata: { trackingNo, storeId: order.shipment?.storeId }
    });
    return { message: `虚拟运单已生成：${trackingNo}`, trackingNo };
  }

  async handleAfterSale(input: { actorId?: string; afterSaleId?: string; action: "approve" | "reject"; reply: string }) {
    validateAfterSaleDecisionInput(input);
    const request = updateDemoAfterSale(input);
    appendDemoAuditLog({
      actorId: input.actorId,
      actorRole: "MERCHANT",
      action: input.action === "approve" ? "AFTER_SALE_APPROVE" : "AFTER_SALE_REJECT",
      targetType: "AfterSaleRequest",
      targetId: request.id,
      metadata: { reply: input.reply, status: request.status }
    });
    return input.action === "approve" ? "售后已通过并记录审计日志" : "售后已驳回并记录审计日志";
  }

  async reviewMerchantApplication(input: { actorId?: string; applicationId?: string; action: "approve" | "reject"; reason?: string }) {
    validateMerchantReviewInput(input);
    const application = updateDemoMerchantApplication(input);
    appendDemoAuditLog({
      actorId: input.actorId,
      actorRole: "ADMIN",
      action: input.action === "approve" ? "MERCHANT_REVIEW_APPROVE" : "MERCHANT_REVIEW_REJECT",
      targetType: "MerchantApplication",
      targetId: application.id,
      metadata: { reason: input.reason ?? "", status: application.status }
    });
    return input.action === "approve" ? "商家审核已通过，店铺已生成" : "商家申请已驳回";
  }

  async saveHomeBanner(input: HomeBannerInput) {
    validateHomeBannerInput(input);
    const banner = saveDemoHomeBanner(input);
    appendDemoAuditLog({
      actorId: input.actorId,
      actorRole: "ADMIN",
      action: "HOME_BANNER_SAVE",
      targetType: "HomeBanner",
      targetId: banner.id,
      metadata: { title: banner.title, status: banner.status }
    });
    return "首页配置已保存，顾客首页展示已更新";
  }

  async updateSystemSetting(input: { actorId?: string; key: string; value?: string }) {
    validateSystemSettingInput(input);
    const setting = getDemoSystemSetting(input.key);
    if (!setting) throw new Error("系统配置项不存在");
    const updated = updateDemoSystemSetting(input.key, nextSystemSettingValue(input.key, setting.value, input.value));
    appendDemoAuditLog({
      actorId: input.actorId,
      actorRole: "ADMIN",
      action: "SYSTEM_SETTING_UPDATE",
      targetType: "SystemSetting",
      targetId: input.key,
      metadata: { from: setting.value, to: updated.value }
    });
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
  if (key === "homeCacheVersion") {
    const parsed = Number.parseInt(currentValue, 10);
    return String(Number.isFinite(parsed) ? parsed + 1 : 1);
  }
  if (requestedValue) return requestedValue;
  if (currentValue === "enabled") return "disabled";
  if (currentValue === "disabled") return "enabled";
  if (currentValue === "required") return "auto";
  if (currentValue === "auto") return "required";
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
    const storeIds = user.role === "MERCHANT"
      ? (await db.store.findMany({
        where: { ownerId: user.id },
        select: { id: true }
      })).map((store) => store.id)
      : [];

    if (user.role === "ADMIN") {
      await db.auditLog.create({
        data: {
          actorId: user.id,
          action: "ADMIN_LOGIN",
          targetType: "User",
          targetId: user.id,
          metadata: { account: input.account },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
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
        phone: user.phone,
        storeIds
      }
    };
  }

  async registerCustomer(input: RegisterInput) {
    validateRegisterInput(input);
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
    validateCustomerProfile(input);
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
    validateCheckoutInput(input);
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const orderNo = makeBusinessNo("MO");
    const paymentNo = makeBusinessNo("PAY");
    const paymentSucceeded = input.paymentMethod !== "fail";
    const nextStatus = nextOrderStatusAfterPayment(paymentSucceeded);
    const directProductId = input.productId?.trim();
    const directQuantity = input.quantity ?? 1;

    const createdOrder = await db.$transaction(async (tx) => {
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
      const payableAmountCents = checkoutTotalCents(totalAmountCents);

      const order = await tx.order.create({
        data: {
          userId,
          orderNo,
          status: nextStatus,
          totalAmountCents: payableAmountCents,
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
              amountCents: payableAmountCents,
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
    validatePaymentRetryInput(input);
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

  async confirmReceive(input: { userId?: string; orderNo: string; status: OrderStatus }) {
    const db = await this.getDb();
    const userId = activeUserId(input.userId);
    const nextStatus = nextOrderStatusAfterReceive(input.status);
    const order = await db.order.findUnique({ where: { orderNo: input.orderNo } });
    if (!order) throw new Error("订单不存在，无法确认收货");
    if (order.userId !== userId) throw new Error("只能确认自己的订单");
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
    validateReviewInput(input);
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
    validateAfterSaleInput(input);
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

  async submitMerchantApplication(input: MerchantApplicationInput): Promise<MerchantApplicationResult> {
    validateMerchantApplicationInput(input);
    const db = await this.getDb();
    const existingStore = await db.store.findFirst({
      where: { ownerId: input.userId }
    });
    if (existingStore) throw new Error("当前账号已拥有店铺");

    const reviewSetting = await db.systemSetting.findUnique({ where: { key: "merchantManualReview" } });
    if (reviewSetting?.value === "auto") {
      const store = await db.$transaction(async (tx) => {
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
        const promotedUser = await tx.user.update({
          where: { id: input.userId },
          data: { role: "MERCHANT" }
        });
        const createdStore = await tx.store.create({
          data: {
            ownerId: input.userId,
            categoryId: input.categoryId,
            name: input.storeName,
            description: input.description,
            status: "ACTIVE"
          }
        });
        return {
          storeId: createdStore.id,
          email: promotedUser.email,
          phone: promotedUser.phone
        };
      });
      return {
        message: "开店申请已自动通过，店铺已生成",
        promotedUser: {
          id: input.userId,
          role: "MERCHANT",
          email: store.email,
          phone: store.phone,
          storeIds: [store.storeId]
        }
      };
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
    return { message: "开店申请已提交，状态为待审核" };
  }

  async publishProduct(input: ProductInput) {
    validateProductInput(input);
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
    validateStoreProfileInput(input);
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
    validateProductInput(input);
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
    const isReviewOnly = store.status === input.status;

    await db.$transaction(async (tx) => {
      if (!isReviewOnly) {
        await tx.store.update({
          where: { id: input.storeId },
          data: { status: input.status }
        });
      }
      if (!isReviewOnly && input.status === "FROZEN") {
        await tx.product.updateMany({
          where: { storeId: input.storeId, status: "ACTIVE" },
          data: { status: "OFF_SHELF" }
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: isReviewOnly ? "STORE_REVIEW" : input.status === "FROZEN" ? "STORE_FREEZE" : "STORE_ACTIVATE",
          targetType: "Store",
          targetId: input.storeId,
          metadata: { status: input.status, reviewedOnly: isReviewOnly },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
    });
    if (isReviewOnly) return "店铺复核完成，状态未变化";
    return input.status === "FROZEN" ? "店铺已冻结" : "店铺已恢复经营";
  }

  async createShipment(input: { actorId?: string; storeId?: string; orderNo: string; status: OrderStatus }) {
    validateShipmentInput(input);
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
    const targetItem = input.storeId
      ? order.items.find((item) => item.storeId === input.storeId)
      : order.items.find((item) => !input.actorId || item.store.ownerId === input.actorId);
    if (!targetItem) throw new Error("订单不包含当前店铺商品，无法生成运单");
    if (order.shipments.some((shipment) => shipment.storeId === targetItem.storeId)) {
      throw new Error("该店铺订单已有有效运单");
    }
    if (input.actorId && targetItem.store.ownerId !== input.actorId) {
      throw new Error("只能为自己店铺的订单生成运单");
    }
    if (!order.items.some((item) => item.storeId === targetItem.storeId && item.status === "TO_SHIP")) {
      throw new Error("当前店铺没有待发货商品");
    }
    const nextStatus = nextOrderStatusAfterShipment(input.status);
    const shouldAdvanceWholeOrder = !order.items.some((item) =>
      item.storeId !== targetItem.storeId && item.status === "TO_SHIP"
    );
    const trackingNo = makeVirtualTrackingNo(input.orderNo);

    await db.$transaction(async (tx) => {
      if (shouldAdvanceWholeOrder) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus }
        });
      }
      await tx.orderItem.updateMany({
        where: { orderId: order.id, storeId: targetItem.storeId },
        data: { status: nextStatus }
      });
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          storeId: targetItem.storeId,
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
          metadata: { trackingNo, shipmentId: shipment.id, storeId: targetItem.storeId },
          result: "SUCCESS",
          ipAddress: "127.0.0.1"
        }
      });
    });

    return { message: `虚拟运单已生成：${trackingNo}`, trackingNo };
  }

  async handleAfterSale(input: { actorId?: string; afterSaleId?: string; action: "approve" | "reject"; reply: string }) {
    validateAfterSaleDecisionInput(input);
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
      const otherOpenAfterSales = input.action === "reject"
        ? await tx.afterSaleRequest.count({
          where: {
            id: { not: request.id },
            status: { in: ["REQUESTED", "APPROVED", "RETURNING"] },
            orderItem: { orderId: request.orderItem.orderId }
          }
        })
        : 0;
      await tx.afterSaleRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          merchantReply: input.reply
        }
      });
      const restoredStatus = otherOpenAfterSales > 0 ? "AFTER_SALE" : "DELIVERED";
      await tx.orderItem.update({
        where: { id: request.orderItemId },
        data: { status: nextStatus === "REJECTED" ? restoredStatus : "AFTER_SALE" }
      });
      await tx.order.update({
        where: { id: request.orderItem.orderId },
        data: { status: nextStatus === "REJECTED" ? restoredStatus : "AFTER_SALE" }
      });
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
    validateMerchantReviewInput(input);
    const db = await this.getDb();
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
    validateHomeBannerInput(input);
    const db = await this.getDb();
    if (!input.actorId) throw new Error("只有管理员可以保存首页配置");
    const targetId = input.id ?? "new";
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
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "HOME_BANNER_SAVE",
        targetType: "HomeBanner",
        targetId,
        metadata: {
          title: input.title,
          status: input.status
        },
        result: "SUCCESS",
        ipAddress: "127.0.0.1"
      }
    });
    return "首页配置已保存，顾客首页展示已更新";
  }

  async updateSystemSetting(input: { actorId?: string; key: string; value?: string }) {
    validateSystemSettingInput(input);
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
