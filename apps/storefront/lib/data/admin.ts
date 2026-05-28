import type { AuditLog, MerchantApplicationStatus, StoreStatus, UserRole } from "@minimal-mall/types";
import {
  listDemoAuditLogs,
  listDemoAfterSales,
  listDemoHomeBanners,
  listDemoMerchantApplications,
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

export async function getAdminOverview() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const [storeCount, pendingMerchantCount, onlineBannerCount, afterSaleCount] = await Promise.all([
      db.store.count(),
      db.merchantApplication.count({ where: { status: "SUBMITTED" } }),
      db.homeBanner.count({ where: { status: "ONLINE" } }),
      db.afterSaleRequest.count({ where: { status: "REQUESTED" } })
    ]);
    return {
      storeCount,
      pendingMerchantCount,
      onlineBannerCount,
      afterSaleCount,
      health: "99.2%"
    };
  }
  return {
    storeCount: listDemoStores().length,
    pendingMerchantCount: listDemoMerchantApplications().filter((item) => item.status === "SUBMITTED").length,
    onlineBannerCount: listDemoHomeBanners({ onlineOnly: true }).length,
    afterSaleCount: listDemoAfterSales().filter((item) => item.status === "REQUESTED").length,
    health: "99.2%"
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
