import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function countUsersByRole(role: "ADMIN" | "CUSTOMER" | "MERCHANT") {
  return prisma.user.count({ where: { role, status: "ACTIVE" } });
}

async function main() {
  const [
    adminCount,
    customerCount,
    merchantCount,
    pendingApplications,
    categoryCount,
    purchasableProductCount,
    activeStoreCount,
    bannerCount,
    afterSaleCount,
    reviewCount
  ] = await Promise.all([
    countUsersByRole("ADMIN"),
    countUsersByRole("CUSTOMER"),
    countUsersByRole("MERCHANT"),
    prisma.merchantApplication.count({ where: { status: "SUBMITTED" } }),
    prisma.category.count({ where: { enabled: true } }),
    prisma.product.count({ where: { status: "ACTIVE", stock: { gt: 0 }, store: { status: "ACTIVE" } } }),
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.homeBanner.count({ where: { status: "ONLINE" } }),
    prisma.afterSaleRequest.count(),
    prisma.review.count()
  ]);

  assert(adminCount >= 1, "seed must include at least one active admin");
  assert(customerCount >= 2, "seed must include at least two active customers");
  assert(merchantCount >= 2, "seed must include at least two active merchants");
  assert(pendingApplications >= 1, "seed must include at least one pending merchant application");
  assert(categoryCount >= 3, "seed must include at least three enabled categories");
  assert(purchasableProductCount >= 8, "seed must include at least eight purchasable active products");
  assert(activeStoreCount >= 2, "seed must include at least two active stores");
  assert(bannerCount >= 2, "seed must include at least two online banners");
  assert(afterSaleCount >= 1, "seed must include at least one after-sale request");
  assert(reviewCount >= 2, "seed must include at least two reviews");

  const orderStatuses = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true }
  });
  const statusSet = new Set(orderStatuses.map((item) => item.status));
  assert(statusSet.has("TO_SHIP"), "seed must include a to-ship order");
  assert(statusSet.has("SHIPPED"), "seed must include a shipped order");
  assert(statusSet.has("DELIVERED") || statusSet.has("COMPLETED"), "seed must include a delivered or completed order");

  const shippedOrder = await prisma.order.findFirst({
    where: { status: "SHIPPED" },
    include: { shipments: { include: { events: true } } }
  });
  assert(shippedOrder?.shipments[0]?.events.length && shippedOrder.shipments[0].events.length >= 3, "seed shipped order must include at least three shipment events");

  const demoAccounts = await prisma.user.findMany({
    where: {
      email: {
        in: ["admin@example.com", "customer@example.com", "merchant@example.com"]
      }
    },
    select: { email: true, passwordHash: true }
  });
  assert(demoAccounts.length === 3, "seed must include admin/customer/merchant demo accounts");
  for (const account of demoAccounts) {
    assert(account.passwordHash.startsWith("scrypt:"), `demo account ${account.email} must use a hashed password`);
    assert(!account.passwordHash.includes("12345678"), `demo account ${account.email} must not store plaintext password`);
  }

  const summary = {
    admins: adminCount,
    customers: customerCount,
    merchants: merchantCount,
    pendingApplications,
    categories: categoryCount,
    purchasableProducts: purchasableProductCount,
    activeStores: activeStoreCount,
    banners: bannerCount,
    afterSales: afterSaleCount,
    reviews: reviewCount,
    orderStatuses: Object.fromEntries(orderStatuses.map((item) => [item.status, item._count._all]))
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("Seed verification passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
