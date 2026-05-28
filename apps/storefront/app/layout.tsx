import type { Metadata } from "next";
import {
  getActiveMerchantStore,
  listAdminStores,
  listAuditLogs,
  listCartItems,
  listCustomerOrders,
  listDiscoverProducts,
  listHomeBannersForAdmin,
  listMerchantAfterSales,
  listMerchantApplications,
  listMerchantOrders,
  listMerchantProducts,
  listStores
} from "@/lib/data";
import { getCurrentSessionUser } from "@/lib/session";
import { AppNavigation } from "./components/AppNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimal Mall 在线商城",
  description: "顾客前台、商家中台、管理员后台一体化课程项目"
};

interface SearchItem {
  id: string;
  label: string;
  href: string;
  type: string;
  text: string;
}

async function listRoleSearchItems(user: Awaited<ReturnType<typeof getCurrentSessionUser>>): Promise<SearchItem[]> {
  if (!user) return [];
  if (user.role === "MERCHANT") {
    const store = await getActiveMerchantStore(user.id);
    if (!store) return [];
    const [merchantProducts, merchantOrders, merchantAfterSales] = await Promise.all([
      listMerchantProducts(store.id),
      listMerchantOrders(store.id),
      listMerchantAfterSales(store.id)
    ]);
    return [
      ...merchantProducts.map((product) => ({
        id: product.id,
        label: product.name,
        href: "/merchant/products",
        type: "商家商品",
        text: `${product.name} ${product.description} ${product.status} ${store.name}`
      })),
      ...merchantOrders.map((order) => ({
        id: order.id,
        label: order.orderNo,
        href: "/merchant/orders",
        type: "商家订单",
        text: `${order.orderNo} ${order.status} ${order.primaryProduct?.name ?? ""} ${order.shipment?.trackingNo ?? ""}`
      })),
      ...merchantAfterSales.map((item) => ({
        id: item.id,
        label: item.reason,
        href: "/merchant/orders",
        type: "售后",
        text: `${item.reason} ${item.description} ${item.status} ${item.evidenceUrl ?? ""}`
      }))
    ];
  }
  if (user.role === "ADMIN") {
    const [applications, adminStores, banners, auditLogs] = await Promise.all([
      listMerchantApplications(),
      listAdminStores(),
      listHomeBannersForAdmin(),
      listAuditLogs()
    ]);
    return [
      ...applications.map((item) => ({
        id: item.id,
        label: item.storeName,
        href: "/admin/merchants",
        type: "商家申请",
        text: `${item.storeName} ${item.description} ${item.status} ${item.reviewReason ?? ""} ${item.userId}`
      })),
      ...adminStores.map((store) => ({
        id: store.id,
        label: store.name,
        href: "/admin/merchants",
        type: "商家",
        text: `${store.name} ${store.description} ${store.status}`
      })),
      ...banners.map((banner) => ({
        id: banner.id,
        label: banner.title,
        href: "/admin/home",
        type: "广告位",
        text: `${banner.title} ${banner.subtitle} ${banner.status} ${banner.linkUrl} ${banner.imageUrl}`
      })),
      ...auditLogs.map((log) => ({
        id: log.id,
        label: log.action,
        href: "/admin/system",
        type: "审计",
        text: `${log.actorName} ${log.actorRole} ${log.action} ${log.targetType} ${log.targetId} ${log.result} ${log.createdAt}`
      }))
    ];
  }
  return [];
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await getCurrentSessionUser();
  const isCustomer = sessionUser?.role === "CUSTOMER";
  const [products, stores, cartItems, orders, roleSearchItems] = await Promise.all([
    listDiscoverProducts(),
    listStores(),
    isCustomer ? listCartItems(sessionUser.id) : Promise.resolve([]),
    isCustomer ? listCustomerOrders(sessionUser.id) : Promise.resolve([]),
    listRoleSearchItems(sessionUser)
  ]);
  const searchItems = [
    ...products.map((product) => ({
      id: product.id,
      label: product.name,
      href: `/products/${product.id}`,
      type: "商品",
      text: `${product.name} ${product.description} ${stores.find((store) => store.id === product.storeId)?.name ?? ""}`
    })),
    ...stores.map((store) => ({
      id: store.id,
      label: store.name,
      href: "/#products",
      type: "店铺",
      text: `${store.name} ${store.description}`
    })),
    ...orders.map((order) => ({
      id: order.id,
      label: order.orderNo,
      href: "/orders",
      type: "订单",
      text: `${order.orderNo} ${order.primaryProduct?.name ?? ""} ${order.shipment?.trackingNo ?? ""}`
    })),
    ...roleSearchItems
  ];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <html lang="zh-CN">
      <body>
        <AppNavigation cartCount={cartCount} searchItems={searchItems}>
          {children}
        </AppNavigation>
      </body>
    </html>
  );
}
