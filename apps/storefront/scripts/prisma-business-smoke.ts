import { prisma } from "@minimal-mall/db";
import type { ProductStatus } from "@minimal-mall/types";
import { PrismaMallWriteService } from "../lib/services/mall-service";

const runId = `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const service = new PrismaMallWriteService(prisma);

let userId: string | undefined;
let orderId: string | undefined;
let orderNo: string | undefined;
let productId: string | undefined;
let originalProductStatus: ProductStatus | undefined;
let stockAdjusted = false;

function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for prisma:smoke");
  }
}

async function cleanup() {
  if (orderId || userId) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          ...(orderId ? [{ targetId: orderId }] : []),
          ...(userId ? [{ targetId: userId }] : [])
        ]
      }
    });
  }
  if (userId) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  if (productId && stockAdjusted) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: { increment: 1 },
        status: originalProductStatus ?? "ACTIVE"
      }
    });
  }
}

async function main() {
  assertDatabaseUrl();
  await prisma.$connect();

  const product = await prisma.product.findFirst({
    where: {
      status: "ACTIVE",
      stock: { gt: 0 },
      store: { status: "ACTIVE" }
    },
    include: { store: true },
    orderBy: { createdAt: "asc" }
  });
  if (!product) throw new Error("No active seeded product with stock is available for prisma:smoke");
  productId = product.id;
  originalProductStatus = product.status;

  const auth = await service.registerCustomer({
    account: `${runId}@example.com`,
    password: "Smoke123456",
    nickname: "真实业务烟测",
    contactPhone: `139${Date.now().toString().slice(-8)}`,
    defaultAddress: "江西省南昌市红谷滩区真实业务烟测路 1 号"
  });
  userId = auth.user.id;

  await service.checkout({
    userId,
    receiver: "真实业务烟测",
    phone: "13900000000",
    address: "江西省南昌市红谷滩区真实业务烟测路 1 号",
    paymentMethod: "balance",
    productId: product.id,
    quantity: 1
  });
  stockAdjusted = true;

  const order = await prisma.order.findFirst({
    where: { userId },
    include: {
      items: true,
      payments: true
    },
    orderBy: { createdAt: "desc" }
  });
  if (!order) throw new Error("Prisma smoke checkout did not create an order");
  orderId = order.id;
  orderNo = order.orderNo;
  if (order.status !== "TO_SHIP") throw new Error(`Expected TO_SHIP after payment, received ${order.status}`);
  if (order.payments[0]?.status !== "SUCCESS") throw new Error("Prisma smoke payment was not successful");

  const shipment = await service.createShipment({
    actorId: product.store.ownerId,
    storeId: product.storeId,
    orderNo,
    status: "TO_SHIP"
  });
  if (!/^VL-\d{4}-\d{4}$/.test(shipment.trackingNo)) {
    throw new Error(`Invalid virtual tracking number: ${shipment.trackingNo}`);
  }

  const shippedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: true,
      shipments: { include: { events: true } }
    }
  });
  if (shippedOrder?.status !== "SHIPPED") throw new Error("Prisma smoke order was not shipped");
  if ((shippedOrder.shipments[0]?.events.length ?? 0) < 3) {
    throw new Error("Prisma smoke shipment did not create the required logistics timeline");
  }

  await service.confirmReceive({
    userId,
    orderNo,
    status: "SHIPPED"
  });

  await service.submitReview({
    userId,
    orderItemId: shippedOrder.items[0]?.id ?? "",
    rating: 5,
    content: "真实业务烟测评价内容。"
  });

  const completedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: { include: { review: true } }
    }
  });
  if (completedOrder?.status !== "COMPLETED") throw new Error("Prisma smoke order was not completed after review");
  if (!completedOrder.items[0]?.review) throw new Error("Prisma smoke review was not persisted");

  console.log(JSON.stringify({
    ok: true,
    runId,
    productId: product.id,
    orderNo,
    trackingNo: shipment.trackingNo,
    status: completedOrder.status
  }, null, 2));
}

main()
  .then(cleanup)
  .catch(async (error) => {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error("cleanup failed", cleanupError);
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
