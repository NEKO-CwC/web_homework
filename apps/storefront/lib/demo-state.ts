import {
  canCreateAfterSale,
  canReviewOrderItem,
  nextAfterSaleStatus,
  nextMerchantApplicationStatus,
  nextOrderStatusAfterPayment,
  nextOrderStatusAfterReceive,
  isProductPurchasable,
  nextOrderStatusAfterShipment
} from "@minimal-mall/auth";
import type {
  AfterSaleRequest,
  AfterSaleStatus,
  AfterSaleType,
  AuditLog,
  BannerStatus,
  CartLine,
  HomeBanner,
  MerchantApplication,
  Order,
  OrderStatus,
  Product,
  ProductStatus,
  Store,
  StoreStatus,
  SystemSetting
} from "@minimal-mall/types";
import { afterSales, auditLogs, banners, cartLines, currentCustomer, merchantApplications, orders, products, settings, stores } from "./fixtures";
import { checkoutTotalCents } from "./format";

export interface DemoCustomerProfile {
  id: string;
  nickname: string;
  email: string;
  phone: string;
  defaultAddress: string;
  passwordHash?: string;
}

interface DemoCartLine extends CartLine {
  userId: string;
}

interface DemoStateStore {
  afterSales: AfterSaleRequest[];
  auditLogs: AuditLog[];
  banners: HomeBanner[];
  cartLines: DemoCartLine[];
  customerProfiles: DemoCustomerProfile[];
  merchantApplications: MerchantApplication[];
  orders: Order[];
  products: Product[];
  settings: SystemSetting[];
  stores: Store[];
}

const demoStateKey = Symbol.for("minimal-mall.demo-state");

function createDemoStateStore(): DemoStateStore {
  return {
    afterSales: cloneAfterSales(afterSales),
    auditLogs: cloneAuditLogs(auditLogs),
    banners: banners.map((banner) => ({ ...banner })),
    cartLines: cloneCartLines(cartLines.map((line) => ({ ...line, userId: currentCustomer.id }))),
    customerProfiles: [cloneCustomerProfile(currentCustomer)],
    merchantApplications: cloneMerchantApplications(merchantApplications),
    orders: cloneOrders(orders),
    products: cloneProducts(products),
    settings: settings.map((setting) => ({ ...setting })),
    stores: cloneStores(stores)
  };
}

function getDemoStateStore() {
  const globalStore = globalThis as typeof globalThis & {
    [demoStateKey]?: DemoStateStore;
  };
  globalStore[demoStateKey] ??= createDemoStateStore();
  return globalStore[demoStateKey];
}

function cloneCustomerProfile(value: DemoCustomerProfile) {
  return { ...value };
}

function cloneOrders(value: Order[]) {
  return value.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
    shipment: order.shipment
      ? {
          ...order.shipment,
          events: order.shipment.events.map((event) => ({ ...event }))
        }
      : undefined
  }));
}

function cloneAfterSales(value: AfterSaleRequest[]) {
  return value.map((item) => ({ ...item }));
}

function cloneAuditLogs(value: AuditLog[]) {
  return value.map((item) => ({ ...item }));
}

function cloneCartLines(value: DemoCartLine[]) {
  return value.map((item) => ({ ...item }));
}

function cloneMerchantApplications(value: MerchantApplication[]) {
  return value.map((item) => ({ ...item }));
}

function cloneProducts(value: Product[]) {
  return value.map((product) => ({
    ...product,
    parameters: { ...product.parameters }
  }));
}

function cloneStores(value: Store[]) {
  return value.map((store) => ({ ...store }));
}

function formatDemoTimestamp(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function makeDemoBusinessNo(prefix: "MO") {
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

function assertDemoStoreOwnership(store: Store, actorId?: string, message = "只能维护自己的店铺") {
  if (actorId && actorId !== "admin-1" && store.ownerId !== actorId) throw new Error(message);
}

function findDemoPurchasableProduct(productId?: string, productName?: string) {
  const store = getDemoStateStore();
  const product = productId
    ? store.products.find((item) => item.id === productId)
    : store.products.find((item) => item.name === productName);
  if (!product) throw new Error("商品不存在，无法加入购物车");
  const productStore = store.stores.find((item) => item.id === product.storeId);
  if (!isProductPurchasable({
    status: product.status,
    stock: product.stock,
    storeStatus: productStore?.status ?? "FROZEN"
  })) {
    throw new Error("库存不足或店铺冻结，无法加入购物车");
  }
  return product;
}

export function listDemoHomeBanners({ onlineOnly = false } = {}): HomeBanner[] {
  return getDemoStateStore().banners
    .filter((banner) => !onlineOnly || banner.status === "ONLINE")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((banner) => ({ ...banner }));
}

export function listDemoAuditLogs(): AuditLog[] {
  return cloneAuditLogs(getDemoStateStore().auditLogs);
}

export function appendDemoAuditLog(input: {
  actorId?: string;
  actorName?: string;
  actorRole: AuditLog["actorRole"];
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  result?: string;
}): AuditLog {
  const store = getDemoStateStore();
  const metadataEntries = Object.entries(input.metadata ?? {}).filter(([, value]) => value !== undefined);
  const log: AuditLog = {
    id: `audit-demo-${store.auditLogs.length + 1}`,
    actorName: input.actorName ?? (input.actorRole === "MERCHANT" ? "极简生活旗舰店" : "平台管理员"),
    actorRole: input.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    result: input.result ?? "SUCCESS",
    metadataSummary: metadataEntries.length > 0
      ? metadataEntries.map(([key, value]) => `${key}=${String(value)}`).join("；")
      : "无附加信息",
    ipAddress: "127.0.0.1",
    createdAt: formatDemoTimestamp()
  };
  store.auditLogs = [log, ...store.auditLogs];
  return { ...log };
}

export function saveDemoHomeBanner(input: {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  status: BannerStatus;
}): HomeBanner {
  const store = getDemoStateStore();
  const existing = input.id ? store.banners.find((banner) => banner.id === input.id) : undefined;
  if (existing) {
    existing.title = input.title;
    existing.subtitle = input.subtitle ?? "";
    existing.imageUrl = input.imageUrl;
    existing.linkUrl = input.linkUrl;
    existing.status = input.status;
    return { ...existing };
  }

  const banner: HomeBanner = {
    id: `banner-${store.banners.length + 1}`,
    title: input.title,
    subtitle: input.subtitle ?? "",
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl,
    status: input.status,
    sortOrder: store.banners.length + 1
  };
  store.banners = [...store.banners, banner];
  return { ...banner };
}

export function listDemoProducts(): Product[] {
  return cloneProducts(getDemoStateStore().products);
}

export function getDemoProduct(id: string): Product | undefined {
  const product = getDemoStateStore().products.find((item) => item.id === id);
  return product ? cloneProducts([product])[0] : undefined;
}

export function listDemoAvailableProducts(): Product[] {
  const store = getDemoStateStore();
  return cloneProducts(store.products.filter((product) => {
    const productStore = store.stores.find((item) => item.id === product.storeId);
    return isProductPurchasable({
      status: product.status,
      stock: product.stock,
      storeStatus: productStore?.status ?? "FROZEN"
    });
  }));
}

export function listDemoStores(): Store[] {
  return cloneStores(getDemoStateStore().stores);
}

export function listDemoMerchantApplications(userId?: string): MerchantApplication[] {
  return cloneMerchantApplications(
    getDemoStateStore().merchantApplications
      .filter((item) => !userId || item.userId === userId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  );
}

export function getDemoStore(id: string): Store | undefined {
  const store = getDemoStateStore().stores.find((item) => item.id === id);
  return store ? { ...store } : undefined;
}

export function getDemoOrderProduct(order: Order): Product | undefined {
  const firstItem = order.items[0];
  return firstItem ? getDemoProduct(firstItem.productId) : undefined;
}

export function listDemoCartLines(userId = currentCustomer.id): CartLine[] {
  return getDemoStateStore().cartLines
    .filter((line) => line.userId === userId)
    .map((line) => ({
      id: line.id,
      productId: line.productId,
      quantity: line.quantity
    }));
}

export function addDemoCartLine(input: {
  userId?: string;
  productId?: string;
  productName: string;
}): { productName: string; cartDelta: string } {
  const store = getDemoStateStore();
  const userId = input.userId ?? currentCustomer.id;
  const product = findDemoPurchasableProduct(input.productId, input.productName);
  const existing = store.cartLines.find((line) => line.userId === userId && line.productId === product.id);
  if (existing && existing.quantity >= product.stock) throw new Error("购物车数量已达到库存上限");
  if (existing) {
    existing.quantity += 1;
    return { productName: product.name, cartDelta: "0" };
  }

  store.cartLines = [
    ...store.cartLines,
    {
      id: `cart-demo-${store.cartLines.length + 1}`,
      userId,
      productId: product.id,
      quantity: 1
    }
  ];
  return { productName: product.name, cartDelta: "1" };
}

export function updateDemoCartQuantity(input: {
  userId?: string;
  cartItemId: string;
  quantity: number;
}): CartLine {
  const store = getDemoStateStore();
  const userId = input.userId ?? currentCustomer.id;
  const line = store.cartLines.find((item) => item.id === input.cartItemId);
  if (!line || line.userId !== userId) throw new Error("购物车商品不存在或无权修改");
  const product = store.products.find((item) => item.id === line.productId);
  if (!product) throw new Error("商品不存在，无法修改数量");
  if (product.stock < 1) throw new Error("商品已缺货，无法修改数量");
  if (input.quantity > product.stock) throw new Error("购物车数量不能超过库存");

  line.quantity = input.quantity;
  return {
    id: line.id,
    productId: line.productId,
    quantity: line.quantity
  };
}

export function removeDemoCartLine(input: {
  userId?: string;
  cartItemId: string;
}): { productName: string } {
  const store = getDemoStateStore();
  const userId = input.userId ?? currentCustomer.id;
  const index = store.cartLines.findIndex((line) => line.id === input.cartItemId);
  const line = index >= 0 ? store.cartLines[index] : undefined;
  if (!line || line.userId !== userId) throw new Error("购物车商品不存在或无权删除");
  const product = store.products.find((item) => item.id === line.productId);
  store.cartLines = store.cartLines.filter((item) => item.id !== input.cartItemId);
  return { productName: product?.name ?? "未知商品" };
}

export function publishDemoProduct(input: {
  actorId?: string;
  storeId: string;
  categoryId?: string;
  name: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  description: string;
}): Product {
  const store = getDemoStateStore();
  const productStore = store.stores.find((item) => item.id === input.storeId);
  if (!productStore) throw new Error("店铺不存在，无法发布商品");
  assertDemoStoreOwnership(productStore, input.actorId, "只能编辑自己店铺的商品");
  if (productStore.status !== "ACTIVE") throw new Error("店铺已冻结，无法发布新商品");

  const product: Product = {
    id: `prod-demo-${store.products.length + 1}`,
    storeId: input.storeId,
    categoryId: input.categoryId ?? productStore.categoryId,
    name: input.name,
    description: input.description,
    sellingPoint: input.description,
    priceCents: input.priceCents,
    stock: input.stock,
    status: input.stock > 0 ? "ACTIVE" : "SOLD_OUT",
    imageUrl: input.imageUrl,
    rating: 0,
    reviewCount: 0,
    parameters: {
      发货: "24 小时内虚拟发货",
      售后: "7 天无理由退换"
    }
  };
  store.products = [product, ...store.products];
  return cloneProducts([product])[0];
}

export function updateDemoStoreProfile(input: {
  actorId?: string;
  storeId: string;
  name: string;
  categoryId: string;
  description: string;
}): Store {
  const store = getDemoStateStore();
  const existing = store.stores.find((item) => item.id === input.storeId);
  if (!existing) throw new Error("店铺不存在，无法保存资料");
  assertDemoStoreOwnership(existing, input.actorId);

  existing.name = input.name;
  existing.categoryId = input.categoryId;
  existing.description = input.description;
  return { ...existing };
}

export function updateDemoProduct(input: {
  actorId?: string;
  productId: string;
  storeId: string;
  categoryId?: string;
  name: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  description: string;
}): Product {
  const store = getDemoStateStore();
  const product = store.products.find((item) => item.id === input.productId);
  if (!product) throw new Error("商品不存在，无法保存");
  const productStore = store.stores.find((item) => item.id === product.storeId);
  if (!productStore) throw new Error("店铺不存在，无法保存资料");
  assertDemoStoreOwnership(productStore, input.actorId, "只能编辑自己店铺的商品");
  if (product.storeId !== input.storeId) throw new Error("只能编辑自己店铺的商品");
  if (productStore.status !== "ACTIVE") throw new Error("店铺已冻结，无法编辑商品");

  product.categoryId = input.categoryId ?? product.categoryId;
  product.name = input.name;
  product.description = input.description;
  product.sellingPoint = input.description;
  product.priceCents = input.priceCents;
  product.stock = input.stock;
  product.status = input.stock > 0 ? "ACTIVE" : "SOLD_OUT";
  product.imageUrl = input.imageUrl;
  return cloneProducts([product])[0];
}

export function updateDemoProductStatus(input: {
  actorId?: string;
  productId: string;
  status: ProductStatus;
}): Product {
  const store = getDemoStateStore();
  const product = store.products.find((item) => item.id === input.productId);
  if (!product) throw new Error("商品不存在，无法修改状态");
  const productStore = store.stores.find((item) => item.id === product.storeId);
  if (!productStore) throw new Error("店铺不存在，无法保存资料");
  assertDemoStoreOwnership(productStore, input.actorId, "只能管理自己店铺的商品");
  if (productStore.status !== "ACTIVE" && input.status === "ACTIVE") throw new Error("店铺已冻结，商品不能上架");
  if (input.status === "ACTIVE" && product.stock < 1) throw new Error("库存不足，商品不能上架");

  product.status = input.status;
  return cloneProducts([product])[0];
}

export function updateDemoStoreStatus(input: {
  actorId?: string;
  storeId: string;
  status: StoreStatus;
}): Store {
  if (!input.actorId) throw new Error("只有管理员可以修改店铺状态");
  const store = getDemoStateStore();
  const existing = store.stores.find((item) => item.id === input.storeId);
  if (!existing) throw new Error("店铺不存在，无法修改状态");

  existing.status = input.status;
  if (input.status === "FROZEN") {
    store.products = store.products.map((product) =>
      product.storeId === input.storeId && product.status === "ACTIVE"
        ? { ...product, status: "OFF_SHELF" }
        : product
    );
  }
  return { ...existing };
}

export function createDemoStore(input: {
  ownerId: string;
  categoryId: string;
  name: string;
  description: string;
}): Store {
  const store = getDemoStateStore();
  const existing = store.stores.find((item) => item.ownerId === input.ownerId);
  if (existing) return { ...existing };

  const nextStore: Store = {
    id: `store-demo-${store.stores.length + 1}`,
    ownerId: input.ownerId,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    status: "ACTIVE"
  };
  store.stores = [...store.stores, nextStore];
  return { ...nextStore };
}

export function createDemoMerchantApplication(input: {
  userId: string;
  storeName: string;
  categoryId: string;
  description: string;
  licenseImageUrl: string;
}): MerchantApplication {
  const store = getDemoStateStore();
  if (store.merchantApplications.some((item) => item.userId === input.userId && item.status === "SUBMITTED")) {
    throw new Error("已有待审核开店申请，请等待管理员处理");
  }

  const application: MerchantApplication = {
    id: `apply-demo-${store.merchantApplications.length + 1}`,
    userId: input.userId,
    storeName: input.storeName,
    categoryId: input.categoryId,
    description: input.description,
    licenseImageUrl: input.licenseImageUrl,
    status: nextMerchantApplicationStatus("DRAFT", "submit"),
    submittedAt: formatDemoTimestamp()
  };
  store.merchantApplications = [application, ...store.merchantApplications];
  return { ...application };
}

export function updateDemoMerchantApplication(input: {
  actorId?: string;
  applicationId?: string;
  action: "approve" | "reject";
  reason?: string;
}): MerchantApplication {
  const store = getDemoStateStore();
  const application = input.applicationId
    ? store.merchantApplications.find((item) => item.id === input.applicationId)
    : store.merchantApplications.find((item) => item.status === "SUBMITTED");
  if (!application) throw new Error("商家申请不存在或已处理");
  if (application.status !== "SUBMITTED") throw new Error("只有待审核申请可以处理");

  application.status = nextMerchantApplicationStatus(application.status, input.action);
  application.reviewReason = input.action === "reject" ? input.reason : undefined;
  if (input.action === "approve") {
    createDemoStore({
      ownerId: application.userId,
      categoryId: application.categoryId,
      name: application.storeName,
      description: application.description
    });
  }
  return { ...application };
}

export function listDemoOrders(userId?: string): Order[] {
  return cloneOrders(getDemoStateStore().orders.filter((order) => !userId || order.userId === userId));
}

export function getDemoOrder(orderNo: string): Order | undefined {
  const order = getDemoStateStore().orders.find((item) => item.orderNo === orderNo);
  return order ? cloneOrders([order])[0] : undefined;
}

export function retryDemoOrderPayment(input: { orderNo: string; userId?: string }): Order {
  const { orderNo, userId } = input;
  const order = getDemoStateStore().orders.find((item) => item.orderNo === orderNo);
  if (!order) throw new Error("订单不存在，无法继续支付");
  if (userId && order.userId !== userId) throw new Error("只能支付自己的订单");
  if (order.status !== "PENDING_PAYMENT") throw new Error("只有待支付订单可以继续支付");

  const store = getDemoStateStore();
  for (const line of order.items) {
    const product = store.products.find((item) => item.id === line.productId);
    const productStore = product ? store.stores.find((item) => item.id === product.storeId) : undefined;
    if (!product || !isProductPurchasable({
      status: product.status,
      stock: product.stock,
      storeStatus: productStore?.status ?? "FROZEN"
    }) || line.quantity > product.stock) {
      throw new Error(`商品 ${product?.name ?? line.productId} 库存不足，无法继续支付`);
    }
  }

  for (const line of order.items) {
    const product = store.products.find((item) => item.id === line.productId);
    if (!product) continue;
    product.stock -= line.quantity;
    if (product.stock === 0) product.status = "SOLD_OUT";
  }
  order.status = nextOrderStatusAfterPayment(true);
  order.items = order.items.map((item) => ({ ...item, status: order.status }));
  return cloneOrders([order])[0];
}

export function createDemoCheckoutOrder(input: {
  userId?: string;
  receiver: string;
  phone: string;
  address: string;
  paymentMethod: string;
  productId?: string;
  quantity?: number;
}): Order {
  const store = getDemoStateStore();
  const userId = input.userId ?? currentCustomer.id;
  const paymentSucceeded = input.paymentMethod !== "fail";
  const nextStatus = nextOrderStatusAfterPayment(paymentSucceeded);
  const directProductId = input.productId?.trim();
  const checkoutItems = directProductId
    ? [{
        productId: directProductId,
        quantity: input.quantity ?? 1
      }]
    : store.cartLines
        .filter((line) => line.userId === userId)
        .map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        }));
  if (checkoutItems.length === 0) throw new Error("购物车为空，无法结算");

  const orderItems = checkoutItems.map((line, index) => {
    const product = store.products.find((item) => item.id === line.productId);
    const productStore = product ? store.stores.find((item) => item.id === product.storeId) : undefined;
    if (!product || !isProductPurchasable({
      status: product.status,
      stock: product.stock,
      storeStatus: productStore?.status ?? "FROZEN"
    }) || line.quantity > product.stock) {
      throw new Error(`商品 ${product?.name ?? line.productId} 库存不足，无法结算`);
    }
    return {
      id: `item-demo-${store.orders.length + 1}-${index + 1}`,
      productId: product.id,
      storeId: product.storeId,
      priceCents: product.priceCents,
      quantity: line.quantity,
      reviewed: false
    };
  });
  const totalAmountCents = checkoutTotalCents(
    orderItems.reduce((sum, line) => sum + line.priceCents * line.quantity, 0)
  );
  const order: Order = {
    id: `order-demo-${store.orders.length + 1}`,
    orderNo: makeDemoBusinessNo("MO"),
    userId,
    status: nextStatus,
    totalAmountCents,
    addressSnapshot: `${input.receiver}，${input.phone}，${input.address}`,
    items: orderItems
  };
  store.orders = [order, ...store.orders];

  if (paymentSucceeded) {
    for (const line of orderItems) {
      const product = store.products.find((item) => item.id === line.productId);
      if (!product) continue;
      product.stock -= line.quantity;
      if (product.stock === 0) product.status = "SOLD_OUT";
    }
  }
  if (!directProductId) {
    store.cartLines = store.cartLines.filter((line) => line.userId !== userId);
  }
  return cloneOrders([order])[0];
}

export function confirmDemoOrderReceive(input: { userId?: string; orderNo: string; status: OrderStatus }): Order {
  const order = getDemoStateStore().orders.find((item) => item.orderNo === input.orderNo);
  if (!order) throw new Error("订单不存在，无法确认收货");
  if (input.userId && order.userId !== input.userId) throw new Error("只能确认自己的订单");
  if (order.status !== input.status) throw new Error("订单状态已变化，请刷新后重试");
  const nextStatus = nextOrderStatusAfterReceive(input.status);
  order.status = nextStatus;
  order.shipment = order.shipment ? { ...order.shipment, status: "DELIVERED" } : undefined;
  return cloneOrders([order])[0];
}

export function createDemoShipment(input: { orderNo: string; status: OrderStatus; storeId?: string; trackingNo: string }): Order {
  const order = getDemoStateStore().orders.find((item) => item.orderNo === input.orderNo);
  if (!order) throw new Error("订单不存在，无法生成运单");
  if (order.status !== input.status) throw new Error("订单状态已变化，请刷新后重试");
  if (order.shipment) throw new Error("该订单已有有效运单");
  const targetItem = input.storeId
    ? order.items.find((item) => item.storeId === input.storeId)
    : order.items[0];
  if (!targetItem) throw new Error(input.storeId ? "订单不包含当前店铺商品，无法生成运单" : "订单没有商品，无法生成运单");
  order.status = nextOrderStatusAfterShipment(input.status);
  order.shipment = {
    id: `ship-${order.id}`,
    orderId: order.id,
    storeId: targetItem.storeId,
    trackingNo: input.trackingNo,
    status: "IN_TRANSIT",
    events: [
      { id: `event-${order.id}-1`, title: "已发货", description: "商家已生成虚拟运单。", occurredAt: "2026-05-28 10:00" },
      { id: `event-${order.id}-2`, title: "运输中", description: "包裹已进入南昌分拨中心。", occurredAt: "2026-05-28 12:30" },
      { id: `event-${order.id}-3`, title: "待确认收货", description: "预计今日送达。", occurredAt: "2026-05-28 16:00" }
    ]
  };
  return cloneOrders([order])[0];
}

export function markDemoOrderItemReviewed(orderItemId: string): Order {
  const order = getDemoStateStore().orders.find((item) => item.items.some((orderItem) => orderItem.id === orderItemId));
  if (!order) throw new Error("订单商品不存在，无法评价");
  const orderItem = order.items.find((item) => item.id === orderItemId);
  if (!orderItem || !canReviewOrderItem(order.status, orderItem.reviewed)) {
    throw new Error("只有已收货且未评价的订单商品可以评价");
  }
  orderItem.reviewed = true;
  order.status = "COMPLETED";
  return cloneOrders([order])[0];
}

export function listDemoAfterSales(userId?: string): AfterSaleRequest[] {
  return cloneAfterSales(getDemoStateStore().afterSales.filter((item) => !userId || item.userId === userId));
}

export function createDemoAfterSale(input: {
  userId?: string;
  orderItemId: string;
  type: AfterSaleType;
  reason: string;
  description: string;
  evidenceUrl?: string;
}): AfterSaleRequest {
  const store = getDemoStateStore();
  const userId = input.userId ?? currentCustomer.id;
  const order = store.orders.find((item) => item.items.some((orderItem) => orderItem.id === input.orderItemId));
  if (!order) throw new Error("订单商品不存在，无法申请售后");
  if (order.userId !== userId) throw new Error("只能为自己的订单申请售后");
  if (!canCreateAfterSale(order.status)) throw new Error("当前订单状态不支持售后申请");
  if (store.afterSales.some((item) => item.orderItemId === input.orderItemId && !["REJECTED", "CLOSED"].includes(item.status))) {
    throw new Error("该订单商品已有售后处理中");
  }

  const request: AfterSaleRequest = {
    id: `after-${store.afterSales.length + 1}`,
    userId,
    orderItemId: input.orderItemId,
    type: input.type,
    reason: input.reason,
    description: input.description,
    evidenceUrl: input.evidenceUrl,
    status: "REQUESTED"
  };
  order.status = "AFTER_SALE";
  store.afterSales = [request, ...store.afterSales];
  return { ...request };
}

export function updateDemoAfterSale(input: {
  actorId?: string;
  afterSaleId?: string;
  action: "approve" | "reject";
  reply: string;
}): AfterSaleRequest {
  const store = getDemoStateStore();
  const request = input.afterSaleId
    ? store.afterSales.find((item) => item.id === input.afterSaleId)
    : store.afterSales.find((item) => item.status === "REQUESTED");
  if (!request) throw new Error("售后申请不存在或已处理");

  const order = store.orders.find((item) => item.items.some((orderItem) => orderItem.id === request.orderItemId));
  const orderItem = order?.items.find((item) => item.id === request.orderItemId);
  if (!order || !orderItem) throw new Error("售后订单商品不存在");
  if (input.actorId && input.actorId !== "merchant-1") throw new Error("只能处理自己店铺的售后申请");

  request.status = nextAfterSaleStatus(request.status as AfterSaleStatus, input.action);
  request.merchantReply = input.reply;
  order.status = request.status === "REJECTED" ? "DELIVERED" : "AFTER_SALE";
  return { ...request };
}

export function getDemoCustomerProfile(userId = currentCustomer.id): DemoCustomerProfile {
  const profile = getDemoStateStore().customerProfiles.find((item) => item.id === userId);
  return cloneCustomerProfile(profile ?? currentCustomer);
}

export function findDemoCustomerProfileById(userId: string): DemoCustomerProfile | undefined {
  const profile = getDemoStateStore().customerProfiles.find((item) => item.id === userId);
  if (profile) return cloneCustomerProfile(profile);
  if (userId === currentCustomer.id) return cloneCustomerProfile(currentCustomer);
  if (userId === "user-customer-2") {
    return {
      id: "user-customer-2",
      nickname: "陈舟",
      email: "buyer@example.com",
      phone: "13800000002",
      defaultAddress: "江西省南昌市青山湖区创新路 18 号"
    };
  }
  if (userId.startsWith("user-e2e-")) {
    return {
      id: userId,
      nickname: "验收顾客",
      email: "",
      phone: "",
      defaultAddress: currentCustomer.defaultAddress
    };
  }
  return undefined;
}

export function findDemoCustomerProfileByAccount(account: string): DemoCustomerProfile | undefined {
  const profile = getDemoStateStore().customerProfiles.find((item) =>
    item.email === account || item.phone === account
  );
  return profile ? cloneCustomerProfile(profile) : undefined;
}

export function saveDemoCustomerProfile(input: {
  userId?: string;
  nickname: string;
  contactPhone: string;
  defaultAddress: string;
}): DemoCustomerProfile {
  const store = getDemoStateStore();
  const id = input.userId ?? currentCustomer.id;
  const existing = store.customerProfiles.find((profile) => profile.id === id);
  if (existing) {
    existing.nickname = input.nickname;
    existing.phone = input.contactPhone;
    existing.defaultAddress = input.defaultAddress;
    return cloneCustomerProfile(existing);
  }

  const profile: DemoCustomerProfile = {
    id,
    nickname: input.nickname,
    email: id === currentCustomer.id ? currentCustomer.email : "",
    phone: input.contactPhone,
    defaultAddress: input.defaultAddress
  };
  store.customerProfiles = [...store.customerProfiles, profile];
  return cloneCustomerProfile(profile);
}

export function registerDemoCustomer(input: {
  account: string;
  nickname: string;
  contactPhone: string;
  defaultAddress: string;
  passwordHash?: string;
}): DemoCustomerProfile {
  const store = getDemoStateStore();
  const isEmail = input.account.includes("@");
  const email = isEmail ? input.account : "";
  const phone = isEmail ? input.contactPhone : input.account;
  const exists = store.customerProfiles.some((profile) =>
    (email && profile.email === email) || (phone && profile.phone === phone)
  );
  if (exists) throw new Error("手机号或邮箱已注册");

  const profile: DemoCustomerProfile = {
    id: `user-demo-${store.customerProfiles.length + 1}`,
    nickname: input.nickname,
    email,
    phone,
    defaultAddress: input.defaultAddress,
    passwordHash: input.passwordHash
  };
  store.customerProfiles = [...store.customerProfiles, profile];
  return cloneCustomerProfile(profile);
}

export function listDemoSystemSettings(): SystemSetting[] {
  return getDemoStateStore().settings.map((setting) => ({ ...setting }));
}

export function getDemoSystemSetting(key: string): SystemSetting | undefined {
  const setting = getDemoStateStore().settings.find((item) => item.key === key);
  return setting ? { ...setting } : undefined;
}

export function updateDemoSystemSetting(key: string, value: string): SystemSetting {
  const setting = getDemoStateStore().settings.find((item) => item.key === key);
  if (!setting) throw new Error("系统配置项不存在");
  setting.value = value;
  return { ...setting };
}

export function resetDemoState() {
  const store = getDemoStateStore();
  store.afterSales = cloneAfterSales(afterSales);
  store.auditLogs = cloneAuditLogs(auditLogs);
  store.banners = banners.map((banner) => ({ ...banner }));
  store.cartLines = cloneCartLines(cartLines.map((line) => ({ ...line, userId: currentCustomer.id })));
  store.customerProfiles = [cloneCustomerProfile(currentCustomer)];
  store.merchantApplications = cloneMerchantApplications(merchantApplications);
  store.orders = cloneOrders(orders);
  store.products = cloneProducts(products);
  store.settings = settings.map((setting) => ({ ...setting }));
  store.stores = cloneStores(stores);
}

export function resetDemoSystemSettings() {
  resetDemoState();
}
