"use client";

import type { UserRole } from "@minimal-mall/types";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Home,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@minimal-mall/ui";
import { MobileNavButton } from "./MobileNavButton";
import { CartCountBadge } from "./CartCountBadge";
import { GlobalSearch } from "./GlobalSearch";

interface SearchItem {
  id: string;
  label: string;
  href: string;
  type: string;
  text: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  count?: number;
  activeHref?: string;
}

type ShellMode = "storefront" | "merchant" | "admin";

interface NavGroup {
  title: string;
  items: NavItem[];
}

const workbenchSearchTypes = new Set(["商家商品", "商家订单", "售后", "商家申请", "商家", "广告位", "审计"]);

function getShellMode(pathname: string): ShellMode {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/merchant") && pathname !== "/merchant/apply") return "merchant";
  return "storefront";
}

function createStorefrontItems(cartCount: number, userRole?: UserRole | null): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "首页", icon: Home },
    { href: "/#products", label: "分类", icon: Package, activeHref: "/#products" }
  ];

  if (userRole === "CUSTOMER") {
    items.push(
      { href: "/cart", label: "购物车", icon: ShoppingCart, count: cartCount },
      { href: "/orders", label: "我的订单", icon: Truck },
      { href: "/after-sale", label: "评价售后", icon: ReceiptText },
      { href: "/merchant/apply", label: "申请开店", icon: Store }
    );
  } else if (userRole === "MERCHANT") {
    items.push({ href: "/merchant/products", label: "卖家中心", icon: Store });
  } else if (userRole === "ADMIN") {
    items.push({ href: "/admin", label: "管理后台", icon: LayoutDashboard });
  } else {
    items.push(
      { href: "/cart", label: "购物车", icon: ShoppingCart, count: cartCount },
      { href: "/merchant/apply", label: "申请开店", icon: Store }
    );
  }

  items.push({ href: "/account", label: userRole ? "我的账号" : "登录注册", icon: UserRound });
  return items;
}

function createWorkbenchGroups(shell: Extract<ShellMode, "merchant" | "admin">): NavGroup[] {
  if (shell === "merchant") {
    return [
      {
        title: "卖家中心",
        items: [
          { href: "/merchant/products", label: "商品管理 / 店铺资料", icon: Package },
          { href: "/merchant/orders", label: "订单发货 / 售后处理", icon: Truck }
        ]
      }
    ];
  }

  return [
    {
      title: "管理后台",
      items: [
        { href: "/admin", label: "平台总览", icon: LayoutDashboard },
        { href: "/admin/merchants", label: "商家审核", icon: Store },
        { href: "/admin/home", label: "首页广告", icon: Home },
        { href: "/admin/system", label: "系统维护", icon: Settings }
      ]
    }
  ];
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({
  cartCount,
  searchItems,
  userRole,
  children
}: {
  cartCount: number;
  searchItems: SearchItem[];
  userRole?: UserRole | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shell = getShellMode(pathname);
  const visibleSearchItems = shell === "storefront"
    ? searchItems.filter((item) => !workbenchSearchTypes.has(item.type))
    : searchItems;

  if (shell === "storefront") {
    const storefrontItems = createStorefrontItems(cartCount, userRole);

    return (
      <div className="storefront-shell">
        <header className="storefront-header">
          <div className="storefront-header-inner">
            <Link className="storefront-brand" href="/">
              <div className="brand-mark">M</div>
              <div>
                <strong>Minimal Mall</strong>
                <span>精选日常好物</span>
              </div>
            </Link>
            <nav className="storefront-nav" aria-label="商城导航">
              {storefrontItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.activeHref ?? item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`storefront-nav-link ${active ? "active" : ""}`}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {typeof item.count === "number" ? <CartCountBadge initialCount={item.count} /> : null}
                  </Link>
                );
              })}
            </nav>
            <div className="storefront-search">
              <GlobalSearch items={visibleSearchItems} />
            </div>
          </div>
        </header>
        <main className="main storefront-main">
          {children}
        </main>
      </div>
    );
  }

  const groups = createWorkbenchGroups(shell);
  const brandSubtitle = shell === "merchant" ? "卖家经营工作台" : "平台治理后台";
  const backLabel = shell === "merchant" ? "返回商城" : "返回商城";

  return (
    <div className="app-shell">
      <button
        className={`nav-scrim ${open ? "open" : ""}`}
        type="button"
        aria-label="关闭导航遮罩"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <aside id="primary-sidebar" className={`sidebar ${open ? "open" : ""}`} aria-label="主导航">
        <div className="sidebar-head">
          <Link className="brand" href="/" onClick={() => setOpen(false)}>
            <div className="brand-mark">M</div>
            <div>
              <h1>Minimal Mall</h1>
              <p>{brandSubtitle}</p>
            </div>
          </Link>
          <Button
            className="nav-close"
            type="button"
            variant="ghost"
            aria-label="关闭导航"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </Button>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <div className="role-title">{group.title}</div>
            <div className="nav-list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`nav-link ${active ? "active" : ""}`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                  >
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
          <MobileNavButton open={open} onToggle={() => setOpen((current) => !current)} />
          <GlobalSearch items={visibleSearchItems} />
          <div className="top-actions">
            <Link className="ui-button ui-button--secondary" href="/">
              <ArrowLeft size={16} /> {backLabel}
            </Link>
            <Link className="ui-button ui-button--primary" href="/account">账号</Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
