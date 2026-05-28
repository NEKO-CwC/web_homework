import type { Product } from "@minimal-mall/types";
import { formatMoney, formatProductStatus } from "@/lib/format";

export function formatProductList(items: Product[]) {
  return items.map((product) => ({
    id: product.id,
    name: product.name,
    price: formatMoney(product.priceCents),
    stock: product.stock,
    status: formatProductStatus(product.status),
    tone: product.status === "ACTIVE" ? "success" as const : product.status === "SOLD_OUT" ? "danger" as const : "warning" as const
  }));
}
