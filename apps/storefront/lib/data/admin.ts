import type { AuditLog, MerchantApplicationStatus, StoreStatus, UserRole } from "@minimal-mall/types";
import {
  listDemoAuditLogs,
  listDemoAfterSales,
  listDemoHomeBanners,
  listDemoMerchantApplications,
  listDemoOrders,
  listDemoStores,
  listDemoSystemSettings
} from "../demo-state";
import {
  getPrismaClient,
  isPrismaDataMode,
  mapAfterSale,
  mapAuditLog,
  mapBanner,
  mapSetting,
  mapStore
} from "./db";
import { normalizePagination, paginateArray, type PaginationInput } from "./pagination";

export interface SystemServiceStatus {
  key: "payment" | "shipment" | "audit";
  title: string;
  description: string;
  label: string;
  tone: "success" | "warning" | "danger" | "accent" | "muted";
  details: {
    label: string;
    value: string;
  }[];
}

function summarizeSystemServices(statuses: SystemServiceStatus[]) {
  const healthyCount = statuses.filter((status) => status.tone === "success").length;
  const attentionStatus = statuses.find((status) => status.tone !== "success");
  return {
    health: `${healthyCount}/${statuses.length} 正常`,
    systemTodoTitle: attentionStatus
      ? `${attentionStatus.title}${attentionStatus.label}`
      : "服务状态正常",
    systemTodoDescription: attentionStatus
      ? attentionStatus.description
      : "虚拟支付、虚拟运单和审计日志均正常。",
    systemTodoTone: attentionStatus?.tone ?? "success"
  };
}

export async function getAdminOverview() {
  const serviceSummaryPromise = listSystemServiceStatuses().then(summarizeSystemServices);
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const [storeCount, pendingMerchantCount, onlineBannerCount, afterSaleCount, serviceSummary] = await Promise.all([
      db.store.count(),
      db.merchantApplication.count({ where: { status: "SUBMITTED" } }),
      db.homeBanner.count({ where: { status: "ONLINE" } }),
      db.afterSaleRequest.count({ where: { status: "REQUESTED" } }),
      serviceSummaryPromise
    ]);
    return {
      storeCount,
      pendingMerchantCount,
      onlineBannerCount,
      afterSaleCount,
      ...serviceSummary
    };
  }
  const serviceSummary = await serviceSummaryPromise;
  return {
    storeCount: listDemoStores().length,
    pendingMerchantCount: listDemoMerchantApplications().filter((item) => item.status === "SUBMITTED").length,
    onlineBannerCount: listDemoHomeBanners({ onlineOnly: true }).length,
    afterSaleCount: listDemoAfterSales().filter((item) => item.status === "REQUESTED").length,
    ...serviceSummary
  };
}

export async function listMerchantApplications() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.merchantApplication.findMany({
      orderBy: { submittedAt: "desc" }
    });
    return rows.map((item) => ({
      id: item.id,
      userId: item.userId,
      storeName: item.storeName,
      categoryId: item.categoryId,
      description: item.description,
      licenseImageUrl: item.licenseImageUrl,
      status: item.status,
      reviewReason: item.reviewReason ?? undefined,
      submittedAt: item.submittedAt.toISOString().slice(0, 16).replace("T", " ")
    }));
  }
  return listDemoMerchantApplications();
}

export interface MerchantApplicationFilters extends PaginationInput {
  status?: MerchantApplicationStatus | "";
}

function mapMerchantApplication(item: {
  id: string;
  userId: string;
  storeName: string;
  categoryId: string;
  description: string;
  licenseImageUrl: string;
  status: MerchantApplicationStatus;
  reviewReason?: string | null;
  submittedAt: Date | string;
}) {
  return {
    id: item.id,
    userId: item.userId,
    storeName: item.storeName,
    categoryId: item.categoryId,
    description: item.description,
    licenseImageUrl: item.licenseImageUrl,
    status: item.status,
    reviewReason: item.reviewReason ?? undefined,
    submittedAt: typeof item.submittedAt === "string"
      ? item.submittedAt
      : item.submittedAt.toISOString().slice(0, 16).replace("T", " ")
  };
}

export async function listMerchantApplicationsPage(filters: MerchantApplicationFilters = {}) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const { page, pageSize, skip } = normalizePagination(filters);
    const where = {
      ...(filters.status ? { status: filters.status } : {})
    };
    const [rows, total] = await Promise.all([
      db.merchantApplication.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip,
        take: pageSize
      }),
      db.merchantApplication.count({ where })
    ]);
    return {
      items: rows.map(mapMerchantApplication),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize))
    };
  }
  return paginateArray(
    listDemoMerchantApplications().filter((item) => !filters.status || item.status === filters.status),
    filters
  );
}

export async function listCurrentUserMerchantApplications(userId = "user-customer-1") {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.merchantApplication.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" }
    });
    return rows.map((item) => ({
      id: item.id,
      userId: item.userId,
      storeName: item.storeName,
      categoryId: item.categoryId,
      description: item.description,
      licenseImageUrl: item.licenseImageUrl,
      status: item.status,
      reviewReason: item.reviewReason ?? undefined,
      submittedAt: item.submittedAt.toISOString().slice(0, 16).replace("T", " ")
    }));
  }
  return listDemoMerchantApplications(userId);
}

export async function listAdminStores() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.store.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapStore);
  }
  return listDemoStores();
}

export interface AdminStoreFilters extends PaginationInput {
  status?: StoreStatus | "";
}

export async function listAdminStoresPage(filters: AdminStoreFilters = {}) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const { page, pageSize, skip } = normalizePagination(filters);
    const where = {
      ...(filters.status ? { status: filters.status } : {})
    };
    const [rows, total] = await Promise.all([
      db.store.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      db.store.count({ where })
    ]);
    return {
      items: rows.map(mapStore),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize))
    };
  }
  return paginateArray(
    listDemoStores().filter((store) => !filters.status || store.status === filters.status),
    filters
  );
}

export async function listHomeBannersForAdmin() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.homeBanner.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map(mapBanner);
  }
  return listDemoHomeBanners();
}

export async function listSystemSettings() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.systemSetting.findMany({ orderBy: { key: "asc" } });
    return rows.map(mapSetting);
  }
  return listDemoSystemSettings();
}

function buildSystemServiceStatuses(input: {
  successfulPaymentCount: number;
  pendingPaymentCount: number;
  failedPaymentCount: number;
  shipmentCount: number;
  pendingShipmentOrderCount: number;
  inTransitShipmentCount: number;
  deliveredShipmentCount: number;
  auditLogCount: number;
  failedAuditLogCount: number;
  latestAuditAction: string;
  homeCacheVersion: string;
}): SystemServiceStatus[] {
  const paymentTotal = input.successfulPaymentCount + input.pendingPaymentCount + input.failedPaymentCount;
  const paymentNeedsAttention = paymentTotal === 0 || input.failedPaymentCount > input.successfulPaymentCount;
  const shipmentNeedsAttention = input.shipmentCount === 0 || input.pendingShipmentOrderCount > 0;
  const auditNeedsAttention = input.auditLogCount === 0 || input.failedAuditLogCount > 0;

  return [
    {
      key: "payment",
      title: "虚拟支付",
      label: paymentNeedsAttention ? "需关注" : "正常",
      tone: paymentNeedsAttention ? "warning" : "success",
      description: paymentTotal === 0
        ? "暂无虚拟支付流水，完成一次结算后会更新服务状态。"
        : `已完成 ${input.successfulPaymentCount} 笔虚拟支付，${input.pendingPaymentCount} 笔待支付可在订单页重试。`,
      details: [
        { label: "成功流水", value: `${input.successfulPaymentCount}` },
        { label: "待支付", value: `${input.pendingPaymentCount}` },
        { label: "失败保留", value: `${input.failedPaymentCount}` }
      ]
    },
    {
      key: "shipment",
      title: "虚拟运单",
      label: shipmentNeedsAttention ? "待生成" : "正常",
      tone: shipmentNeedsAttention ? "warning" : "success",
      description: input.shipmentCount === 0
        ? "暂无虚拟运单记录，商家发货后会生成 VL-0000-0000 格式运单。"
        : `已生成 ${input.shipmentCount} 张虚拟运单，${input.pendingShipmentOrderCount} 笔待发货订单需要商家处理。`,
      details: [
        { label: "运单总数", value: `${input.shipmentCount}` },
        { label: "运输中", value: `${input.inTransitShipmentCount}` },
        { label: "已签收", value: `${input.deliveredShipmentCount}` }
      ]
    },
    {
      key: "audit",
      title: "审计与缓存",
      label: auditNeedsAttention ? "需巡检" : "已记录",
      tone: auditNeedsAttention ? "accent" : "success",
      description: input.auditLogCount === 0
        ? "暂无审计记录，关键管理操作完成后会写入日志。"
        : `已记录 ${input.auditLogCount} 条审计日志，最近操作：${input.latestAuditAction}。`,
      details: [
        { label: "异常记录", value: `${input.failedAuditLogCount}` },
        { label: "缓存版本", value: input.homeCacheVersion },
        { label: "日志来源", value: "审计表" }
      ]
    }
  ];
}

export async function listSystemServiceStatuses(): Promise<SystemServiceStatus[]> {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const [
      successfulPaymentCount,
      pendingPaymentCount,
      failedPaymentCount,
      shipmentCount,
      pendingShipmentOrderCount,
      inTransitShipmentCount,
      deliveredShipmentCount,
      auditLogCount,
      failedAuditLogCount,
      latestAuditLog,
      homeCacheSetting
    ] = await Promise.all([
      db.payment.count({ where: { status: "SUCCESS" } }),
      db.payment.count({ where: { status: "PENDING" } }),
      db.payment.count({ where: { status: "FAILED" } }),
      db.shipment.count(),
      db.order.count({ where: { status: "TO_SHIP" } }),
      db.shipment.count({ where: { status: "IN_TRANSIT" } }),
      db.shipment.count({ where: { status: "DELIVERED" } }),
      db.auditLog.count(),
      db.auditLog.count({ where: { result: "FAILED" } }),
      db.auditLog.findFirst({
        include: { actor: true },
        orderBy: { createdAt: "desc" }
      }),
      db.systemSetting.findUnique({ where: { key: "homeCacheVersion" } })
    ]);

    return buildSystemServiceStatuses({
      successfulPaymentCount,
      pendingPaymentCount,
      failedPaymentCount,
      shipmentCount,
      pendingShipmentOrderCount,
      inTransitShipmentCount,
      deliveredShipmentCount,
      auditLogCount,
      failedAuditLogCount,
      latestAuditAction: latestAuditLog ? mapAuditLog(latestAuditLog).action : "暂无记录",
      homeCacheVersion: homeCacheSetting?.value ?? "未配置"
    });
  }

  const orders = listDemoOrders();
  const auditLogs = listDemoAuditLogs();
  const homeCacheVersion = listDemoSystemSettings().find((setting) => setting.key === "homeCacheVersion")?.value ?? "未配置";
  const shipments = orders.flatMap((order) => order.shipment ? [order.shipment] : []);
  const successfulPaymentCount = orders.filter((order) => !["PENDING_PAYMENT", "CANCELLED"].includes(order.status)).length;
  const pendingPaymentCount = orders.filter((order) => order.status === "PENDING_PAYMENT").length;
  const latestAuditLog = [...auditLogs].sort((left, right) => auditLogTimestamp(right) - auditLogTimestamp(left))[0];

  return buildSystemServiceStatuses({
    successfulPaymentCount,
    pendingPaymentCount,
    failedPaymentCount: 0,
    shipmentCount: shipments.length,
    pendingShipmentOrderCount: orders.filter((order) => order.status === "TO_SHIP").length,
    inTransitShipmentCount: shipments.filter((shipment) => shipment.status === "IN_TRANSIT").length,
    deliveredShipmentCount: shipments.filter((shipment) => shipment.status === "DELIVERED").length,
    auditLogCount: auditLogs.length,
    failedAuditLogCount: auditLogs.filter((log) => log.result === "FAILED").length,
    latestAuditAction: latestAuditLog?.action ?? "暂无记录",
    homeCacheVersion
  });
}

export interface AuditLogFilters {
  actorRole?: UserRole | "";
  targetType?: string;
  result?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number | string;
  pageSize?: number | string;
}

function parseDateFilter(value?: string, boundary: "start" | "end" = "start") {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return boundary === "start"
    ? new Date(`${trimmed}T00:00:00.000Z`)
    : new Date(`${trimmed}T23:59:59.999Z`);
}

function auditLogTimestamp(log: AuditLog) {
  const normalized = log.createdAt.includes("T") ? log.createdAt : log.createdAt.replace(" ", "T");
  return new Date(normalized).getTime();
}

function filterAuditLog(log: AuditLog, filters: AuditLogFilters) {
  const keyword = filters.keyword?.trim().toLowerCase();
  const startDate = parseDateFilter(filters.startDate, "start");
  const endDate = parseDateFilter(filters.endDate, "end");
  const timestamp = auditLogTimestamp(log);
  if (filters.actorRole && log.actorRole !== filters.actorRole) return false;
  if (filters.targetType && log.targetType !== filters.targetType) return false;
  if (filters.result && log.result !== filters.result) return false;
  if (startDate && timestamp < startDate.getTime()) return false;
  if (endDate && timestamp > endDate.getTime()) return false;
  if (!keyword) return true;
  return [
    log.actorName,
    log.actorRole,
    log.action,
    log.targetType,
    log.targetId,
    log.result,
    log.metadataSummary,
    log.ipAddress,
    log.createdAt
  ].some((value) => value.toLowerCase().includes(keyword));
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const result = await listAuditLogsPage(filters);
  return result.items;
}

export async function listAuditLogsPage(filters: AuditLogFilters = {}) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const keyword = filters.keyword?.trim();
    const { page, pageSize, skip } = normalizePagination(filters);
    const containsKeyword = keyword ? { contains: keyword, mode: "insensitive" as const } : undefined;
    const startDate = parseDateFilter(filters.startDate, "start");
    const endDate = parseDateFilter(filters.endDate, "end");
    const where = {
      ...(filters.actorRole ? { actor: { role: filters.actorRole } } : {}),
      ...(filters.targetType ? { targetType: filters.targetType } : {}),
      ...(filters.result ? { result: filters.result } : {}),
      ...(startDate || endDate
        ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {})
          }
        }
        : {}),
      ...(containsKeyword
        ? {
          OR: [
            { action: containsKeyword },
            { targetType: containsKeyword },
            { targetId: containsKeyword },
            { result: containsKeyword },
            { ipAddress: containsKeyword },
            { actor: { is: { email: containsKeyword } } },
            { actor: { is: { phone: containsKeyword } } }
          ]
        }
        : {})
    };
    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      db.auditLog.count({ where })
    ]);
    return {
      items: rows.map(mapAuditLog),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize))
    };
  }
  return paginateArray(listDemoAuditLogs().filter((log) => filterAuditLog(log, filters)), filters);
}

export async function listAdminAfterSales() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.afterSaleRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapAfterSale);
  }
  return listDemoAfterSales();
}
