import type {
  AfterSaleRequest,
  AuditLog,
  CartLine,
  Category,
  HomeBanner,
  MerchantApplication,
  Order,
  Product,
  Review,
  Store,
  SystemSetting
} from "@minimal-mall/types";
import { isProductPurchasable } from "@minimal-mall/auth";

export const currentCustomer = {
  id: "user-customer-1",
  nickname: "林一",
  email: "customer@example.com",
  phone: "13800000001",
  defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
};

export const categories: Category[] = [
  { id: "cat-digital", name: "数码生活", sortOrder: 1, enabled: true },
  { id: "cat-home", name: "家居百货", sortOrder: 2, enabled: true },
  { id: "cat-fashion", name: "服饰配件", sortOrder: 3, enabled: true }
];

export const stores: Store[] = [
  {
    id: "store-minimal",
    ownerId: "merchant-1",
    name: "极简生活旗舰店",
    categoryId: "cat-digital",
    description: "桌面数码与轻办公设备精选。",
    status: "ACTIVE"
  },
  {
    id: "store-home",
    ownerId: "merchant-2",
    name: "家居优选店",
    categoryId: "cat-home",
    description: "高质感家居收纳与日用百货。",
    status: "ACTIVE"
  }
];

export const products: Product[] = [
  {
    id: "prod-lamp",
    storeId: "store-minimal",
    categoryId: "cat-digital",
    name: "空气感智能台灯",
    description: "低眩光面板、三档色温、隐藏式转轴，适合学习办公桌面。",
    sellingPoint: "低眩光学习光，三档色温",
    priceCents: 32900,
    stock: 128,
    status: "ACTIVE",
    imageUrl: "/products/lamp.jpg",
    rating: 4.9,
    reviewCount: 86,
    parameters: {
      材质: "阳极氧化铝",
      发货: "24 小时内虚拟发货",
      售后: "7 天无理由退换"
    }
  },
  {
    id: "prod-headphone",
    storeId: "store-minimal",
    categoryId: "cat-digital",
    name: "旅行降噪耳机",
    description: "轻量化主动降噪，长途通勤稳定续航。",
    sellingPoint: "主动降噪，长续航",
    priceCents: 59900,
    stock: 64,
    status: "ACTIVE",
    imageUrl: "/products/headphone.jpg",
    rating: 4.8,
    reviewCount: 42,
    parameters: {
      续航: "40 小时",
      发货: "48 小时内虚拟发货",
      售后: "支持换货"
    }
  },
  {
    id: "prod-charger",
    storeId: "store-minimal",
    categoryId: "cat-digital",
    name: "模块化桌面充电站",
    description: "多设备快充，线缆隐藏收纳。",
    sellingPoint: "多口快充，桌面无杂线",
    priceCents: 25900,
    stock: 88,
    status: "ACTIVE",
    imageUrl: "/products/charger.jpg",
    rating: 4.7,
    reviewCount: 31,
    parameters: {
      功率: "100W",
      接口: "USB-C x3 / USB-A x1",
      售后: "一年质保"
    }
  },
  {
    id: "prod-speaker",
    storeId: "store-minimal",
    categoryId: "cat-digital",
    name: "便携蓝牙音箱",
    description: "铝合金机身，客厅与露营双场景。",
    sellingPoint: "小体积，高质感声场",
    priceCents: 39900,
    stock: 35,
    status: "ACTIVE",
    imageUrl: "/products/speaker.jpg",
    rating: 4.6,
    reviewCount: 27,
    parameters: {
      防水: "IPX5",
      连接: "蓝牙 5.3",
      售后: "15 天换新"
    }
  },
  {
    id: "prod-storage",
    storeId: "store-home",
    categoryId: "cat-home",
    name: "模块化收纳套装",
    description: "抽屉、线盒、托盘自由组合。",
    sellingPoint: "模块组合，收纳更克制",
    priceCents: 18900,
    stock: 58,
    status: "ACTIVE",
    imageUrl: "/products/storage.jpg",
    rating: 4.9,
    reviewCount: 104,
    parameters: {
      套件: "抽屉 / 线盒 / 托盘",
      材质: "ABS + 竹盖",
      售后: "破损包换"
    }
  },
  {
    id: "prod-aroma",
    storeId: "store-home",
    categoryId: "cat-home",
    name: "柔雾香薰机",
    description: "静音雾化与氛围灯，卧室友好。",
    sellingPoint: "静音柔雾，睡眠模式",
    priceCents: 21900,
    stock: 0,
    status: "SOLD_OUT",
    imageUrl: "/products/aroma.jpg",
    rating: 4.5,
    reviewCount: 19,
    parameters: {
      水箱: "350ml",
      噪音: "< 28dB",
      售后: "缺货不可购买"
    }
  },
  {
    id: "prod-bedding",
    storeId: "store-home",
    categoryId: "cat-home",
    name: "高支棉床品四件套",
    description: "亲肤透气，低饱和色系。",
    sellingPoint: "高支棉，低饱和配色",
    priceCents: 45900,
    stock: 23,
    status: "ACTIVE",
    imageUrl: "/products/bedding.jpg",
    rating: 4.8,
    reviewCount: 58,
    parameters: {
      面料: "60 支长绒棉",
      尺寸: "1.5m / 1.8m",
      售后: "未拆封可退"
    }
  },
  {
    id: "prod-cardcase",
    storeId: "store-home",
    categoryId: "cat-fashion",
    name: "真皮卡包",
    description: "轻薄六卡位，通勤口袋友好。",
    sellingPoint: "轻薄六卡位",
    priceCents: 12900,
    stock: 42,
    status: "ACTIVE",
    imageUrl: "/products/cardcase.jpg",
    rating: 4.4,
    reviewCount: 18,
    parameters: {
      材质: "头层牛皮",
      卡位: "6 个",
      售后: "支持换货"
    }
  },
  {
    id: "prod-tote",
    storeId: "store-home",
    categoryId: "cat-fashion",
    name: "防泼水通勤托特包",
    description: "大容量分区，电脑与日常物品独立收纳。",
    sellingPoint: "防泼水面料，分区收纳",
    priceCents: 26900,
    stock: 31,
    status: "ACTIVE",
    imageUrl: "/products/tote.jpg",
    rating: 4.7,
    reviewCount: 22,
    parameters: {
      容量: "16L",
      材质: "防泼水尼龙",
      售后: "支持换货"
    }
  }
];

export const cartLines: CartLine[] = [
  { id: "cart-1", productId: "prod-lamp", quantity: 1 },
  { id: "cart-2", productId: "prod-storage", quantity: 2 }
];

export const orders: Order[] = [
  {
    id: "order-1",
    orderNo: "MO20260528001",
    userId: "user-customer-1",
    status: "TO_SHIP",
    totalAmountCents: 32900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-1",
        productId: "prod-lamp",
        storeId: "store-minimal",
        priceCents: 32900,
        quantity: 1,
        reviewed: false
      }
    ]
  },
  {
    id: "order-2",
    orderNo: "MO20260527008",
    userId: "user-customer-1",
    status: "SHIPPED",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-2",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ],
    shipment: {
      id: "ship-1",
      orderId: "order-2",
      storeId: "store-minimal",
      trackingNo: "VL-8218-0092",
      status: "IN_TRANSIT",
      events: [
        {
          id: "event-1",
          title: "已发货",
          description: "商家已生成虚拟运单。",
          occurredAt: "2026-05-27 09:20"
        },
        {
          id: "event-2",
          title: "运输中",
          description: "包裹已进入南昌分拨中心。",
          occurredAt: "2026-05-27 18:40"
        },
        {
          id: "event-3",
          title: "待确认收货",
          description: "预计今日送达。",
          occurredAt: "2026-05-28 08:30"
        }
      ]
    }
  },
  {
    id: "order-3",
    orderNo: "MO20260525016",
    userId: "user-customer-2",
    status: "DELIVERED",
    totalAmountCents: 37800,
    addressSnapshot: "江西省南昌市青山湖区创新路 18 号",
    items: [
      {
        id: "item-3",
        productId: "prod-storage",
        storeId: "store-home",
        priceCents: 18900,
        quantity: 2,
        reviewed: true
      }
    ],
    shipment: {
      id: "ship-2",
      orderId: "order-3",
      storeId: "store-home",
      trackingNo: "VL-7162-3340",
      status: "DELIVERED",
      events: [
        {
          id: "event-4",
          title: "已发货",
          description: "家居优选店已发货。",
          occurredAt: "2026-05-25 10:20"
        },
        {
          id: "event-5",
          title: "运输中",
          description: "同城配送中。",
          occurredAt: "2026-05-25 15:20"
        },
        {
          id: "event-6",
          title: "已签收",
          description: "顾客已确认收货。",
          occurredAt: "2026-05-25 19:45"
        }
      ]
    }
  },
  {
    id: "order-4",
    orderNo: "MO20260526002",
    userId: "user-customer-1",
    status: "AFTER_SALE",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-4",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ]
  },
  {
    id: "order-12",
    orderNo: "MO20260526012",
    userId: "user-e2e-merchant-after-sale-desktop",
    status: "AFTER_SALE",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-merchant-after-sale-desktop",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ]
  },
  {
    id: "order-13",
    orderNo: "MO20260526013",
    userId: "user-e2e-merchant-after-sale-mobile",
    status: "AFTER_SALE",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-merchant-after-sale-mobile",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ]
  },
  {
    id: "order-8",
    orderNo: "MO20260528008",
    userId: "user-e2e-shipment-desktop",
    status: "TO_SHIP",
    totalAmountCents: 32900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-shipment-desktop",
        productId: "prod-lamp",
        storeId: "store-minimal",
        priceCents: 32900,
        quantity: 1,
        reviewed: false
      }
    ]
  },
  {
    id: "order-9",
    orderNo: "MO20260528009",
    userId: "user-e2e-shipment-mobile",
    status: "TO_SHIP",
    totalAmountCents: 32900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-shipment-mobile",
        productId: "prod-lamp",
        storeId: "store-minimal",
        priceCents: 32900,
        quantity: 1,
        reviewed: false
      }
    ]
  },
  {
    id: "order-6",
    orderNo: "MO20260527009",
    userId: "user-e2e-review-desktop",
    status: "SHIPPED",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-review-desktop",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ],
    shipment: {
      id: "ship-e2e-review-desktop",
      orderId: "order-6",
      storeId: "store-minimal",
      trackingNo: "VL-8218-0109",
      status: "IN_TRANSIT",
      events: [
        {
          id: "event-e2e-review-desktop-1",
          title: "已发货",
          description: "商家已生成虚拟运单。",
          occurredAt: "2026-05-27 09:20"
        },
        {
          id: "event-e2e-review-desktop-2",
          title: "运输中",
          description: "包裹已进入南昌分拨中心。",
          occurredAt: "2026-05-27 18:40"
        },
        {
          id: "event-e2e-review-desktop-3",
          title: "待确认收货",
          description: "预计今日送达。",
          occurredAt: "2026-05-28 08:30"
        }
      ]
    }
  },
  {
    id: "order-7",
    orderNo: "MO20260527010",
    userId: "user-e2e-review-mobile",
    status: "SHIPPED",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-review-mobile",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ],
    shipment: {
      id: "ship-e2e-review-mobile",
      orderId: "order-7",
      storeId: "store-minimal",
      trackingNo: "VL-8218-0110",
      status: "IN_TRANSIT",
      events: [
        {
          id: "event-e2e-review-mobile-1",
          title: "已发货",
          description: "商家已生成虚拟运单。",
          occurredAt: "2026-05-27 09:20"
        },
        {
          id: "event-e2e-review-mobile-2",
          title: "运输中",
          description: "包裹已进入南昌分拨中心。",
          occurredAt: "2026-05-27 18:40"
        },
        {
          id: "event-e2e-review-mobile-3",
          title: "待确认收货",
          description: "预计今日送达。",
          occurredAt: "2026-05-28 08:30"
        }
      ]
    }
  },
  {
    id: "order-10",
    orderNo: "MO20260527011",
    userId: "user-e2e-after-sale-desktop",
    status: "SHIPPED",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-after-sale-desktop",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ],
    shipment: {
      id: "ship-e2e-after-sale-desktop",
      orderId: "order-10",
      storeId: "store-minimal",
      trackingNo: "VL-8218-0111",
      status: "IN_TRANSIT",
      events: [
        {
          id: "event-e2e-after-sale-desktop-1",
          title: "已发货",
          description: "商家已生成虚拟运单。",
          occurredAt: "2026-05-27 09:20"
        },
        {
          id: "event-e2e-after-sale-desktop-2",
          title: "运输中",
          description: "包裹已进入南昌分拨中心。",
          occurredAt: "2026-05-27 18:40"
        },
        {
          id: "event-e2e-after-sale-desktop-3",
          title: "待确认收货",
          description: "预计今日送达。",
          occurredAt: "2026-05-28 08:30"
        }
      ]
    }
  },
  {
    id: "order-11",
    orderNo: "MO20260527012",
    userId: "user-e2e-after-sale-mobile",
    status: "SHIPPED",
    totalAmountCents: 59900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-e2e-after-sale-mobile",
        productId: "prod-headphone",
        storeId: "store-minimal",
        priceCents: 59900,
        quantity: 1,
        reviewed: false
      }
    ],
    shipment: {
      id: "ship-e2e-after-sale-mobile",
      orderId: "order-11",
      storeId: "store-minimal",
      trackingNo: "VL-8218-0112",
      status: "IN_TRANSIT",
      events: [
        {
          id: "event-e2e-after-sale-mobile-1",
          title: "已发货",
          description: "商家已生成虚拟运单。",
          occurredAt: "2026-05-27 09:20"
        },
        {
          id: "event-e2e-after-sale-mobile-2",
          title: "运输中",
          description: "包裹已进入南昌分拨中心。",
          occurredAt: "2026-05-27 18:40"
        },
        {
          id: "event-e2e-after-sale-mobile-3",
          title: "待确认收货",
          description: "预计今日送达。",
          occurredAt: "2026-05-28 08:30"
        }
      ]
    }
  },
  {
    id: "order-5",
    orderNo: "MO20260524003",
    userId: "user-customer-1",
    status: "PENDING_PAYMENT",
    totalAmountCents: 25900,
    addressSnapshot: currentCustomer.defaultAddress,
    items: [
      {
        id: "item-5",
        productId: "prod-charger",
        storeId: "store-minimal",
        priceCents: 25900,
        quantity: 1,
        reviewed: false
      }
    ]
  }
];

export const reviews: Review[] = [
  {
    id: "review-1",
    userId: "user-customer-2",
    productId: "prod-storage",
    orderItemId: "item-3",
    rating: 5,
    content: "收纳尺寸很准，桌面清爽很多。",
    createdAt: "2026-05-25"
  },
  {
    id: "review-2",
    userId: "user-customer-1",
    productId: "prod-lamp",
    orderItemId: "seed-review-2",
    rating: 5,
    content: "灯光柔和，长时间学习眼睛舒服。",
    createdAt: "2026-05-24"
  }
];

export const afterSales: AfterSaleRequest[] = [
  {
    id: "after-1",
    userId: "user-customer-1",
    orderItemId: "item-4",
    type: "EXCHANGE",
    reason: "颜色与预期不符",
    description: "希望换成黑色款。",
    evidenceUrl: "/uploads/evidence-demo.png",
    status: "REQUESTED"
  },
  {
    id: "after-e2e-merchant-desktop",
    userId: "user-e2e-merchant-after-sale-desktop",
    orderItemId: "item-e2e-merchant-after-sale-desktop",
    type: "EXCHANGE",
    reason: "桌面售后筛选",
    description: "桌面项目专用待处理售后。",
    evidenceUrl: "/uploads/evidence-demo.png",
    status: "REQUESTED"
  },
  {
    id: "after-e2e-merchant-mobile",
    userId: "user-e2e-merchant-after-sale-mobile",
    orderItemId: "item-e2e-merchant-after-sale-mobile",
    type: "EXCHANGE",
    reason: "移动售后筛选",
    description: "移动项目专用待处理售后。",
    evidenceUrl: "/uploads/evidence-demo.png",
    status: "REQUESTED"
  }
];

export const merchantApplications: MerchantApplication[] = [
  {
    id: "apply-1",
    userId: "user-applicant",
    storeName: "潮流配件仓",
    categoryId: "cat-fashion",
    description: "主营通勤配件、卡包与旅行小物。",
    licenseImageUrl: "/uploads/license-demo.png",
    status: "SUBMITTED",
    submittedAt: "2026-05-28 09:10"
  },
  {
    id: "apply-2",
    userId: "merchant-1",
    storeName: "极简生活旗舰店",
    categoryId: "cat-digital",
    description: "桌面数码与轻办公设备精选。",
    licenseImageUrl: "/uploads/license-minimal.png",
    status: "APPROVED",
    submittedAt: "2026-05-20 14:10"
  }
];

export const banners: HomeBanner[] = [
  {
    id: "banner-1",
    title: "桌面焕新季",
    subtitle: "精选智能台灯、收纳与办公配件。",
    imageUrl: "/banners/desk-refresh.jpg",
    linkUrl: "/?category=数码生活",
    status: "ONLINE",
    sortOrder: 1
  },
  {
    id: "banner-2",
    title: "轻生活收纳",
    subtitle: "用低噪音设计整理日常。",
    imageUrl: "/banners/home-storage.jpg",
    linkUrl: "/?category=家居百货",
    status: "ONLINE",
    sortOrder: 2
  }
];

export const settings: SystemSetting[] = [
  { key: "memberRegistration", value: "enabled", description: "会员注册开关" },
  { key: "merchantManualReview", value: "required", description: "商家入驻人工审核" },
  { key: "homeCacheVersion", value: "1", description: "首页缓存版本" }
];

export const auditLogs: AuditLog[] = [
  {
    id: "audit-1",
    actorName: "平台管理员",
    actorRole: "ADMIN",
    action: "商家审核通过",
    targetType: "MerchantApplication",
    targetId: "apply-2",
    result: "SUCCESS",
    createdAt: "2026-05-27 16:40"
  },
  {
    id: "audit-2",
    actorName: "极简生活旗舰店",
    actorRole: "MERCHANT",
    action: "生成虚拟运单",
    targetType: "Order",
    targetId: "order-2",
    result: "SUCCESS",
    createdAt: "2026-05-27 09:20"
  },
  {
    id: "audit-3",
    actorName: "平台管理员",
    actorRole: "ADMIN",
    action: "刷新首页缓存",
    targetType: "SystemSetting",
    targetId: "homeCacheVersion",
    result: "SUCCESS",
    createdAt: "2026-05-28 08:12"
  }
];

export function getProduct(id: string) {
  return products.find((product) => product.id === id);
}

export function getStore(id: string) {
  return stores.find((store) => store.id === id);
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id);
}

export function getOrderProduct(order: Order) {
  const firstItem = order.items[0];
  return firstItem ? getProduct(firstItem.productId) : undefined;
}

export function availableProducts() {
  return products.filter((product) => {
    const store = getStore(product.storeId);
    return isProductPurchasable({
      status: product.status,
      stock: product.stock,
      storeStatus: store?.status ?? "FROZEN"
    });
  });
}
