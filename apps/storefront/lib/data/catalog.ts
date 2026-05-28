import type { ProductStatus } from "@minimal-mall/types";
import { categories, getCategory, reviews } from "../fixtures";
import {
  getDemoProduct,
  getDemoStore,
  listDemoAvailableProducts,
  listDemoHomeBanners,
  listDemoProducts,
  listDemoStores
} from "../demo-state";
import {
  getPrismaClient,
  isPrismaDataMode,
  mapBanner,
  mapCategory,
  mapProduct,
  mapReview,
  mapStore
} from "./db";
import { normalizePagination, paginateArray, type PaginationInput } from "./pagination";

export async function listHomeBanners() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.homeBanner.findMany({
      where: { status: "ONLINE" },
      orderBy: { sortOrder: "asc" }
    });
    return rows.map(mapBanner);
  }
  return listDemoHomeBanners({ onlineOnly: true });
}

export async function listCategories() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.category.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" }
    });
    return rows.map(mapCategory);
  }
  return categories.filter((category) => category.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listDiscoverProducts() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.product.findMany({
      where: {
        status: "ACTIVE",
        stock: { gt: 0 },
        store: { status: "ACTIVE" }
      },
      include: {
        images: true,
        reviews: true
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapProduct);
  }
  return listDemoAvailableProducts();
}

export async function findProductDetail(id: string) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const product = await db.product.findUnique({
      where: { id },
      include: {
        store: true,
        category: true,
        images: true,
        reviews: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!product) return null;
    return {
      product: mapProduct(product),
      store: mapStore(product.store),
      category: mapCategory(product.category),
      reviews: product.reviews.map(mapReview)
    };
  }
  const product = getDemoProduct(id);
  if (!product) return null;
  return {
    product,
    store: getDemoStore(product.storeId),
    category: getCategory(product.categoryId),
    reviews: reviews.filter((review) => review.productId === product.id)
  };
}

export async function listMerchantProducts(storeId: string) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.product.findMany({
      where: { storeId },
      include: {
        images: true,
        reviews: true
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapProduct);
  }
  return listDemoProducts().filter((product) => product.storeId === storeId);
}

export interface MerchantProductFilters extends PaginationInput {
  status?: ProductStatus | "";
}

export async function listMerchantProductsPage(storeId: string, filters: MerchantProductFilters = {}) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const { page, pageSize, skip } = normalizePagination(filters);
    const where = {
      storeId,
      ...(filters.status ? { status: filters.status } : {})
    };
    const [rows, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          images: true,
          reviews: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      db.product.count({ where })
    ]);
    return {
      items: rows.map(mapProduct),
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize))
    };
  }
  const filtered = listDemoProducts().filter((product) =>
    product.storeId === storeId && (!filters.status || product.status === filters.status)
  );
  return paginateArray(filtered, filters);
}

export async function listStores() {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const rows = await db.store.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapStore);
  }
  return listDemoStores();
}

export async function findStore(id: string) {
  if (isPrismaDataMode()) {
    const db = await getPrismaClient();
    const row = await db.store.findUnique({ where: { id } });
    return row ? mapStore(row) : undefined;
  }
  return getDemoStore(id);
}
