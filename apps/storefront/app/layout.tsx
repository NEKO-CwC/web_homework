import type { Metadata } from "next";
import Link from "next/link";
import { Home, LayoutDashboard, Package, ReceiptText, Settings, ShoppingCart, Store, Truck, UserRound } from "lucide-react";
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
import { GlobalSearch } from "./components/GlobalSearch";
import { MobileNavButton } from "./components/MobileNavButton";
import { CartCountBadge } from "./components/CartCountBadge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimal Mall 在线商城",
  description: "顾客前台、商家中台、管理员后台一体化课程项目"
};

function createNavGroups(cartCount: number) {
  return [
  {
    title: "顾客前台",
    items: [
      { href: "/", label: "首页 / 商品发现", icon: Home },
      { href: "/cart", label: "购物车", icon: ShoppingCart, count: cartCount },
      { href: "/checkout", label: "结算 / 虚拟支付", icon: ReceiptText },
      { href: "/orders", label: "订单 / 虚拟物流", icon: Truck },
      { href: "/after-sale", label: "评价 / 退换货", icon: UserRound },
      { href: "/account", label: "注册登录 / 个人信息", icon: UserRound }
    ]
  },
  {
    title: "商家中台",
    items: [
      { href: "/merchant/apply", label: "商家开店申请", icon: Store },
      { href: "/merchant/products", label: "商品 / 店铺管理", icon: Package },
      { href: "/merchant/orders", label: "销售 / 物流 / 售后", icon: Truck }
    ]
  },
  {
    title: "管理员后台",
    items: [
      { href: "/admin", label: "平台总览", icon: LayoutDashboard },
      { href: "/admin/merchants", label: "商家审核管理", icon: Store },
      { href: "/admin/home", label: "首页 / 广告位管理", icon: Home },
      { href: "/admin/system", label: "系统维护", icon: Settings }
    ]
  }
  ];
}

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
  const navGroups = createNavGroups(cartItems.length);
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
      text: `${order.orderNo} ${order.primaryProduct?.name ?? ""}`
    })),
    ...roleSearchItems
  ];

  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <aside className="sidebar" aria-label="主导航">
            <Link className="brand" href="/">
              <div className="brand-mark">M</div>
              <div>
                <h1>Minimal Mall</h1>
                <p>顾客 · 商家 · 管理员</p>
              </div>
            </Link>
            {navGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <div className="role-title">{group.title}</div>
                <div className="nav-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link className="nav-link" href={item.href} key={item.href}>
                        <span className="left">
                          <span className="dot" />
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </span>
                        {typeof item.count === "number" ? <CartCountBadge initialCount={item.count} /> : null}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            ))}
          </aside>
          <main className="main">
            <div className="topbar">
              <MobileNavButton />
              <GlobalSearch items={searchItems} />
              <div className="top-actions">
                <Link className="ui-button ui-button--secondary" href="/account">演示登录</Link>
                <Link className="ui-button ui-button--primary" href="/merchant/apply">申请开店</Link>
              </div>
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
