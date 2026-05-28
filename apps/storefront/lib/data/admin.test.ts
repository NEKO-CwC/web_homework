import { beforeEach, describe, expect, it } from "vitest";
import {
  createDemoMerchantApplication,
  resetDemoSystemSettings,
  saveDemoHomeBanner,
  updateDemoAfterSale,
  updateDemoMerchantApplication,
  updateDemoSystemSetting
} from "../demo-state";
import {
  getAdminOverview,
  listAdminAfterSales,
  listAdminStores,
  listAdminStoresPage,
  listAuditLogs,
  listAuditLogsPage,
  listCurrentUserMerchantApplications,
  listHomeBannersForAdmin,
  listMerchantApplications,
  listMerchantApplicationsPage,
  listSystemSettings
} from "./admin";

describe("admin data filters", () => {
  beforeEach(() => {
    resetDemoSystemSettings();
  });

  it("returns admin overview and fixture-backed management lists", async () => {
    await expect(getAdminOverview()).resolves.toMatchObject({
      storeCount: 2,
      pendingMerchantCount: 1,
      onlineBannerCount: 2,
      afterSaleCount: 3
    });
    await expect(listMerchantApplications()).resolves.toHaveLength(2);
    await expect(listCurrentUserMerchantApplications("user-applicant")).resolves.toHaveLength(1);
    await expect(listAdminStores()).resolves.toHaveLength(2);
    await expect(listHomeBannersForAdmin()).resolves.toHaveLength(2);
    await expect(listSystemSettings()).resolves.toHaveLength(3);
    await expect(listAdminAfterSales()).resolves.toHaveLength(3);
  });

  it("counts only requested after-sales as admin pending work", async () => {
    updateDemoAfterSale({
      afterSaleId: "after-1",
      action: "approve",
      reply: "同意换货"
    });

    await expect(getAdminOverview()).resolves.toMatchObject({
      afterSaleCount: 2
    });
    await expect(listAdminAfterSales()).resolves.toHaveLength(3);
  });

  it("returns updated demo system settings", async () => {
    updateDemoSystemSetting("memberRegistration", "disabled");

    await expect(listSystemSettings()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "memberRegistration", value: "disabled" })
    ]));
  });

  it("returns updated demo merchant applications for admin and current user views", async () => {
    const application = createDemoMerchantApplication({
      userId: "user-demo-applicant",
      storeName: "手动审核同步店",
      categoryId: "cat-digital",
      description: "提交后应同步出现在管理员审核队列。",
      licenseImageUrl: "/uploads/license-manual-sync.png"
    });

    await expect(listCurrentUserMerchantApplications("user-demo-applicant")).resolves.toEqual([
      expect.objectContaining({
        id: application.id,
        status: "SUBMITTED"
      })
    ]);
    await expect(listMerchantApplicationsPage({
      status: "SUBMITTED",
      pageSize: 10
    })).resolves.toMatchObject({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({ id: application.id, status: "SUBMITTED" })
      ])
    });
    await expect(getAdminOverview()).resolves.toMatchObject({
      pendingMerchantCount: 2
    });

    updateDemoMerchantApplication({
      applicationId: application.id,
      action: "approve"
    });

    await expect(listCurrentUserMerchantApplications("user-demo-applicant")).resolves.toEqual([
      expect.objectContaining({
        id: application.id,
        status: "APPROVED"
      })
    ]);
    await expect(getAdminOverview()).resolves.toMatchObject({
      storeCount: 3,
      pendingMerchantCount: 1
    });
  });

  it("returns updated demo home banners for admin overview and lists", async () => {
    saveDemoHomeBanner({
      id: "banner-1",
      title: "验收 Banner",
      subtitle: "首页保存后同步展示",
      imageUrl: "/banners/desk-refresh.jpg",
      linkUrl: "/",
      status: "OFFLINE"
    });

    await expect(listHomeBannersForAdmin()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "banner-1", title: "验收 Banner", status: "OFFLINE" })
    ]));
    await expect(getAdminOverview()).resolves.toMatchObject({
      onlineBannerCount: 1
    });
  });

  it("filters and paginates admin merchant and store data", async () => {
    await expect(listMerchantApplicationsPage({
      status: "SUBMITTED",
      pageSize: 1
    })).resolves.toMatchObject({
      total: 1,
      pageCount: 1,
      items: [
        expect.objectContaining({ id: "apply-1", status: "SUBMITTED" })
      ]
    });

    await expect(listAdminStoresPage({
      status: "ACTIVE",
      page: 2,
      pageSize: 1
    })).resolves.toMatchObject({
      total: 2,
      page: 2,
      pageCount: 2,
      items: [
        expect.objectContaining({ status: "ACTIVE" })
      ]
    });
  });

  it("filters audit logs by inclusive date range", async () => {
    const onMay27 = await listAuditLogsPage({
      startDate: "2026-05-27",
      endDate: "2026-05-27"
    });
    expect(onMay27.items).toHaveLength(2);
    expect(onMay27.items.every((log) => log.createdAt.startsWith("2026-05-27"))).toBe(true);

    const afterMay28 = await listAuditLogsPage({
      actorRole: "MERCHANT",
      targetType: "Order",
      startDate: "2026-05-28"
    });
    expect(afterMay28.items).toHaveLength(0);
  });

  it("filters audit logs by role object result keyword and pagination", async () => {
    await expect(listAuditLogs({
      keyword: "刷新首页缓存"
    })).resolves.toEqual([
      expect.objectContaining({
        targetType: "SystemSetting",
        metadataSummary: "from=1；to=2",
        ipAddress: "127.0.0.1"
      })
    ]);

    await expect(listAuditLogs({
      keyword: "127.0.0.1"
    })).resolves.toEqual([
      expect.objectContaining({ id: "audit-1" }),
      expect.objectContaining({ id: "audit-2" }),
      expect.objectContaining({ id: "audit-3" })
    ]);

    await expect(listAuditLogsPage({
      actorRole: "ADMIN",
      targetType: "MerchantApplication",
      result: "SUCCESS",
      keyword: "apply-2",
      pageSize: 1
    })).resolves.toMatchObject({
      total: 1,
      page: 1,
      items: [
        expect.objectContaining({ id: "audit-1" })
      ]
    });

    await expect(listAuditLogsPage({
      actorRole: "CUSTOMER"
    })).resolves.toMatchObject({
      total: 0,
      items: []
    });
  });
});
