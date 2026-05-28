import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();
const demoPasswordHash = "scrypt:minimal-mall-seed:ccb7eb3974499b156b1d6b44e8915f530f1d368773b4fae76291b41c4e172dbc4c9edd5bf3cd77fa3206801cfac369af48e4df4c9a9f3cd2f1f5908a75c0eb7e";

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.afterSaleRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.shipmentEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.merchantApplication.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.homeBanner.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.category.deleteMany();

  const digital = await prisma.category.create({
    data: { id: "cat-digital", name: "数码生活", sortOrder: 1 }
  });
  const home = await prisma.category.create({
    data: { id: "cat-home", name: "家居百货", sortOrder: 2 }
  });
  const fashion = await prisma.category.create({
    data: { id: "cat-fashion", name: "服饰配件", sortOrder: 3 }
  });

  const admin = await prisma.user.create({
    data: {
      id: "admin-1",
      email: "admin@example.com",
      passwordHash: demoPasswordHash,
      role: "ADMIN"
    }
  });
  const customer = await prisma.user.create({
    data: {
      id: "user-customer-1",
      email: "customer@example.com",
      phone: "13800000001",
      passwordHash: demoPasswordHash,
      role: "CUSTOMER",
      customerProfile: {
        create: {
          nickname: "林一",
          contactPhone: "13800000001",
          defaultAddress: "江西省南昌市红谷滩区学府大道 999 号"
        }
      }
    }
  });
  const customerTwo = await prisma.user.create({
    data: {
      id: "user-customer-2",
      email: "buyer@example.com",
      phone: "13800000002",
      passwordHash: demoPasswordHash,
      role: "CUSTOMER",
      customerProfile: {
        create: {
          nickname: "陈舟",
          contactPhone: "13800000002",
          defaultAddress: "江西省南昌市青山湖区创新路 18 号"
        }
      }
    }
  });
  const merchantA = await prisma.user.create({
    data: {
      id: "merchant-1",
      email: "merchant@example.com",
      phone: "13800000003",
      passwordHash: demoPasswordHash,
      role: "MERCHANT"
    }
  });
  const merchantB = await prisma.user.create({
    data: {
      id: "merchant-2",
      email: "home-merchant@example.com",
      phone: "13800000004",
      passwordHash: demoPasswordHash,
      role: "MERCHANT"
    }
  });
  const applicant = await prisma.user.create({
    data: {
      id: "user-applicant",
      email: "apply@example.com",
      phone: "13800000005",
      passwordHash: demoPasswordHash,
      role: "CUSTOMER"
    }
  });

  const storeA = await prisma.store.create({
    data: {
      id: "store-minimal",
      ownerId: merchantA.id,
      categoryId: digital.id,
      name: "极简生活旗舰店",
      description: "桌面数码与轻办公设备精选。",
      status: "ACTIVE"
    }
  });
  const storeB = await prisma.store.create({
    data: {
      id: "store-home",
      ownerId: merchantB.id,
      categoryId: home.id,
      name: "家居优选店",
      description: "高质感家居收纳与日用百货。",
      status: "ACTIVE"
    }
  });

  await prisma.merchantApplication.create({
    data: {
      id: "apply-1",
      userId: applicant.id,
      categoryId: fashion.id,
      storeName: "潮流配件仓",
      description: "主营通勤配件、卡包与旅行小物。",
      licenseImageUrl: "/uploads/license-demo.png",
      status: "SUBMITTED"
    }
  });

  const productData = [
    ["prod-lamp", "空气感智能台灯", "低眩光面板，三档色温，适合学习办公。", 32900, 128, digital.id, storeA.id, "/products/lamp.jpg"],
    ["prod-headphone", "旅行降噪耳机", "轻量化主动降噪，长途通勤稳定续航。", 59900, 64, digital.id, storeA.id, "/products/headphone.jpg"],
    ["prod-charger", "模块化桌面充电站", "多设备快充，线缆隐藏收纳。", 25900, 88, digital.id, storeA.id, "/products/charger.jpg"],
    ["prod-speaker", "便携蓝牙音箱", "铝合金机身，客厅与露营双场景。", 39900, 35, digital.id, storeA.id, "/products/speaker.jpg"],
    ["prod-storage", "模块化收纳套装", "抽屉、线盒、托盘自由组合。", 18900, 58, home.id, storeB.id, "/products/storage.jpg"],
    ["prod-aroma", "柔雾香薰机", "静音雾化与氛围灯，卧室友好。", 21900, 0, home.id, storeB.id, "/products/aroma.jpg"],
    ["prod-bedding", "高支棉床品四件套", "亲肤透气，低饱和色系。", 45900, 23, home.id, storeB.id, "/products/bedding.jpg"],
    ["prod-cardcase", "真皮卡包", "轻薄六卡位，通勤口袋友好。", 12900, 42, fashion.id, storeB.id, "/products/cardcase.jpg"],
    ["prod-tote", "防泼水通勤托特包", "大容量分区，电脑与日常物品独立收纳。", 26900, 31, fashion.id, storeB.id, "/products/tote.jpg"]
  ] as const;

  const products = [];
  for (const [id, name, description, priceCents, stock, categoryId, storeId, imageUrl] of productData) {
    const product = await prisma.product.create({
      data: {
        id,
        name,
        description,
        priceCents,
        stock,
        categoryId,
        storeId,
        status: stock > 0 ? "ACTIVE" : "SOLD_OUT",
        images: {
          create: {
            url: imageUrl,
            sortOrder: 1
          }
        }
      }
    });
    products.push(product);
  }

  await prisma.cartItem.createMany({
    data: [
      { userId: customer.id, productId: products[0].id, quantity: 1 },
      { userId: customer.id, productId: products[4].id, quantity: 2 }
    ]
  });

  const orderToShip = await prisma.order.create({
    data: {
      id: "order-1",
      userId: customer.id,
      orderNo: "MO20260528001",
      status: "TO_SHIP",
      totalAmountCents: 32900,
      addressSnapshot: "江西省南昌市红谷滩区学府大道 999 号",
      items: {
        create: {
          id: "item-1",
          productId: products[0].id,
          storeId: storeA.id,
          priceCents: 32900,
          quantity: 1,
          status: "TO_SHIP"
        }
      },
      payments: {
        create: {
          paymentNo: "PAY20260528001",
          method: "虚拟余额",
          amountCents: 32900,
          status: "SUCCESS"
        }
      }
    }
  });
  const shipped = await prisma.order.create({
    data: {
      id: "order-2",
      userId: customer.id,
      orderNo: "MO20260527008",
      status: "SHIPPED",
      totalAmountCents: 59900,
      addressSnapshot: "江西省南昌市红谷滩区学府大道 999 号",
      items: {
        create: {
          id: "item-2",
          productId: products[1].id,
          storeId: storeA.id,
          priceCents: 59900,
          quantity: 1,
          status: "SHIPPED"
        }
      }
    }
  });
  await prisma.shipment.create({
    data: {
      id: "ship-1",
      orderId: shipped.id,
      storeId: storeA.id,
      trackingNo: "VL-8218-0092",
      status: "IN_TRANSIT",
      events: {
        createMany: {
          data: [
            { title: "已发货", description: "商家已生成虚拟运单。" },
            { title: "运输中", description: "包裹已进入南昌分拨中心。" },
            { title: "待确认收货", description: "预计今日送达。" }
          ]
        }
      }
    }
  });
  const delivered = await prisma.order.create({
    data: {
      id: "order-3",
      userId: customerTwo.id,
      orderNo: "MO20260525016",
      status: "DELIVERED",
      totalAmountCents: 50700,
      addressSnapshot: "江西省南昌市青山湖区创新路 18 号",
      items: {
        create: [
          {
            id: "item-3",
            productId: products[4].id,
            storeId: storeB.id,
            priceCents: 18900,
            quantity: 2,
            status: "DELIVERED"
          },
          {
            id: "item-6",
            productId: products[7].id,
            storeId: storeB.id,
            priceCents: 12900,
            quantity: 1,
            status: "DELIVERED"
          }
        ]
      }
    },
    include: { items: true }
  });

  await prisma.review.create({
    data: {
      id: "review-1",
      userId: customerTwo.id,
      productId: products[4].id,
      orderItemId: delivered.items[0].id,
      rating: 5,
      content: "收纳尺寸很准，桌面清爽很多。"
    }
  });
  await prisma.review.create({
    data: {
      id: "review-2",
      userId: customerTwo.id,
      productId: products[7].id,
      orderItemId: delivered.items[1].id,
      rating: 5,
      content: "卡包做工利落，通勤携带很轻。"
    }
  });
  const afterSaleOrder = await prisma.order.create({
    data: {
      id: "order-4",
      userId: customer.id,
      orderNo: "MO20260526002",
      status: "AFTER_SALE",
      totalAmountCents: 59900,
      addressSnapshot: "江西省南昌市红谷滩区学府大道 999 号",
      items: {
        create: {
          id: "item-4",
          productId: products[1].id,
          storeId: storeA.id,
          priceCents: 59900,
          quantity: 1,
          status: "AFTER_SALE"
        }
      }
    },
    include: { items: true }
  });
  await prisma.afterSaleRequest.create({
    data: {
      id: "after-1",
      userId: customer.id,
      orderItemId: afterSaleOrder.items[0].id,
      type: "EXCHANGE",
      reason: "颜色与预期不符",
      description: "希望换成黑色款。",
      evidenceUrl: "/uploads/evidence-demo.png",
      status: "REQUESTED"
    }
  });
  await prisma.order.create({
    data: {
      id: "order-5",
      userId: customer.id,
      orderNo: "MO20260524003",
      status: "PENDING_PAYMENT",
      totalAmountCents: 25900,
      addressSnapshot: "江西省南昌市红谷滩区学府大道 999 号",
      items: {
        create: {
          id: "item-5",
          productId: products[2].id,
          storeId: storeA.id,
          priceCents: 25900,
          quantity: 1,
          status: "PENDING_PAYMENT"
        }
      },
      payments: {
        create: {
          paymentNo: "PAY20260524003",
          method: "课程演示卡",
          amountCents: 25900,
          status: "FAILED"
        }
      }
    }
  });

  await prisma.homeBanner.createMany({
    data: [
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
    ]
  });
  await prisma.systemSetting.createMany({
    data: [
      { key: "memberRegistration", value: "enabled", description: "会员注册开关" },
      { key: "merchantManualReview", value: "required", description: "商家入驻人工审核" },
      { key: "homeCacheVersion", value: "1", description: "首页缓存版本" }
    ]
  });
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: "MERCHANT_REVIEW",
        targetType: "MerchantApplication",
        targetId: "seed-application",
        metadata: { status: "APPROVED" },
        result: "SUCCESS",
        ipAddress: "127.0.0.1"
      },
      {
        actorId: merchantA.id,
        action: "CREATE_SHIPMENT",
        targetType: "Order",
        targetId: orderToShip.id,
        metadata: { trackingNo: "VL-8218-0092" },
        result: "SUCCESS",
        ipAddress: "127.0.0.1"
      }
    ]
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
