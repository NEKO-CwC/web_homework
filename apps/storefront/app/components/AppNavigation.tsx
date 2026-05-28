"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Package, ReceiptText, Settings, ShoppingCart, Store, Truck, UserRound, X } from "lucide-react";
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

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({
  cartCount,
  searchItems,
  children
}: {
  cartCount: number;
  searchItems: SearchItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = createNavGroups(cartCount);

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
              <p>顾客 · 商家 · 管理员</p>
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
          <GlobalSearch items={searchItems} />
          <div className="top-actions">
            <Link className="ui-button ui-button--secondary" href="/account">演示登录</Link>
            <Link className="ui-button ui-button--primary" href="/merchant/apply">申请开店</Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
