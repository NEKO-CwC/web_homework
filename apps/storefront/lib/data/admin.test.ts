import { beforeEach, describe, expect, it } from "vitest";
import {
  appendDemoAuditLog,
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
  listSystemServiceStatuses,
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
      afterSaleCount: 3,
      health: "2/3 正常",
      systemTodoTitle: "虚拟运单待生成",
      systemTodoDescription: expect.stringContaining("3 笔待发货订单"),
      systemTodoTone: "warning"
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

  it("derives system service statuses from demo orders settings and audit logs", async () => {
    await expect(listSystemServiceStatuses()).resolves.toEqual([
      expect.objectContaining({
        key: "payment",
        title: "虚拟支付",
        label: "正常",
        description: expect.stringContaining("已完成 12 笔虚拟支付"),
        details: expect.arrayContaining([
          { label: "成功流水", value: "12" },
          { label: "待支付", value: "1" }
        ])
      }),
      expect.objectContaining({
        key: "shipment",
        title: "虚拟运单",
        label: "待生成",
        description: expect.stringContaining("3 笔待发货订单"),
        details: expect.arrayContaining([
          { label: "运单总数", value: "6" },
          { label: "运输中", value: "5" },
          { label: "已签收", value: "1" }
        ])
      }),
      expect.objectContaining({
        key: "audit",
        title: "审计与缓存",
        label: "已记录",
        description: expect.stringContaining("最近操作：刷新首页缓存"),
        details: expect.arrayContaining([
          { label: "异常记录", value: "0" },
          { label: "缓存版本", value: "1" }
        ])
      })
    ]);

    updateDemoSystemSetting("homeCacheVersion", "2");
    appendDemoAuditLog({
      actorRole: "ADMIN",
      action: "缓存刷新验收",
      targetType: "SystemSetting",
      targetId: "homeCacheVersion"
    });

    await expect(listSystemServiceStatuses()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "audit",
        description: expect.stringContaining("最近操作：缓存刷新验收"),
        details: expect.arrayContaining([
          { label: "缓存版本", value: "2" }
        ])
      })
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

  it("includes newly appended demo audit logs in admin filters", async () => {
    const log = appendDemoAuditLog({
      actorRole: "ADMIN",
      action: "SYSTEM_SETTING_UPDATE",
      targetType: "SystemSetting",
      targetId: "memberRegistration",
      metadata: { from: "enabled", to: "disabled" }
    });

    await expect(listAuditLogs({
      keyword: "memberRegistration"
    })).resolves.toEqual([
      expect.objectContaining({
        id: log.id,
        targetType: "SystemSetting",
        metadataSummary: "from=enabled；to=disabled"
      })
    ]);
    await expect(listAuditLogsPage({
      actorRole: "ADMIN",
      targetType: "SystemSetting",
      result: "SUCCESS",
      keyword: "disabled",
      pageSize: 5
    })).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({ id: log.id })
      ]
    });
  });
});
