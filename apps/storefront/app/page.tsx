import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingCart, Store } from "lucide-react";
import { Card, StatusBadge } from "@minimal-mall/ui";
import { AddCartForm } from "./components/AddCartForm";
import { EmptyState, ErrorState, LoadingState } from "./components/PageState";
import { listCategories, listDiscoverProducts, listHomeBanners, listStores } from "@/lib/data";
import { formatMoney } from "@/lib/format";

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const selectedCategoryName = (await searchParams)?.category;
  const [products, categories, homeBanners, stores] = await Promise.all([
    listDiscoverProducts(),
    listCategories(),
    listHomeBanners(),
    listStores()
  ]);
  const hero = homeBanners[0];
  const selectedCategory = categories.find((category) => category.name === selectedCategoryName || category.id === selectedCategoryName);
  const visibleProducts = selectedCategory
    ? products.filter((product) => product.categoryId === selectedCategory.id)
    : products;

  return (
    <>
      <section className="hero">
        <Image
          src={hero?.imageUrl ?? "/banners/desk-refresh.jpg"}
          alt={`${hero?.title ?? "桌面焕新季"} Banner`}
          fill
          priority
          className="hero-image"
          sizes="100vw"
        />
        <div className="hero-inner">
          <div>
            <div className="eyebrow"><span className="pulse" />Minimal Mall</div>
            <h2>{hero?.title ?? "桌面焕新季"}</h2>
            <p>{hero?.subtitle ?? "精选智能台灯、收纳与办公配件。"} 当前首页内容来自可维护 Banner seed，管理员保存配置后会同步到顾客首页。</p>
            <div className="hero-actions">
              <Link className="ui-button ui-button--primary" href="#products">
                浏览商品 <ArrowRight size={16} />
              </Link>
              <Link className="ui-button ui-button--secondary" href="/merchant/apply">
                <Store size={16} /> 申请成为商家
              </Link>
            </div>
          </div>
          <div className="device-card">
            <div className="device-screen">
              <strong>购物主链路</strong>
              <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                注册 / 登录 &gt; 浏览商品 &gt; 加入购物车 &gt; 虚拟支付 &gt; 商家发货 &gt; 确认收货 &gt; 评价 / 售后
              </p>
              {products.slice(0, 2).map((product) => (
                <div className="mini-product" key={product.id}>
                  <div className="thumb">
                    <Image
                      src={product.imageUrl}
                      alt={`${product.name} 缩略图`}
                      fill
                      sizes="84px"
                      className="media-image"
                    />
                  </div>
                  <div>
                    <strong>{product.name}</strong>
                    <p style={{ margin: "6px 0", color: "var(--muted)" }}>{formatMoney(product.priceCents)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-head">
        <div>
          <h3>分类筛选</h3>
          <p>仅展示上架、库存充足、商家未冻结的商品。</p>
        </div>
      </section>
      <div className="grid cols-3">
        <Link className={`metric filter-card ${selectedCategory ? "" : "active"}`} href="/#products">
          <div className="num">{products.length}</div>
          <div className="label">全部商品</div>
        </Link>
        {categories.map((category) => (
          <Link
            className={`metric filter-card ${selectedCategory?.id === category.id ? "active" : ""}`}
            href={`/?category=${encodeURIComponent(category.name)}#products`}
            key={category.id}
          >
            <div className="num">{products.filter((product) => product.categoryId === category.id).length}</div>
            <div className="label">{category.name}</div>
          </Link>
        ))}
      </div>

      <section className="section-head" id="products">
        <div>
          <h3>{selectedCategory ? `${selectedCategory.name}商品` : "精选商品"}</h3>
          <p>商品卡片包含图片占位、标题、卖点、价格和加入购物车主操作。</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/cart">
          <ShoppingCart size={16} /> 购物车
        </Link>
      </section>
      {visibleProducts.length === 0 ? <EmptyState label="暂无可购买商品" /> : null}
      <div className="grid cols-4">
        {visibleProducts.map((product) => {
          const store = stores.find((item) => item.id === product.storeId);
          const category = categories.find((item) => item.id === product.categoryId);
          return (
            <Card className="product-card" key={product.id}>
              <Link href={`/products/${product.id}`} className="product-photo" data-label={category?.name ?? "商品"}>
                <Image
                  src={product.imageUrl}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 25vw"
                  className="media-image"
                />
              </Link>
              <div className="product-info">
                <div className="top-actions" style={{ justifyContent: "space-between" }}>
                  <StatusBadge tone="accent">{store?.name}</StatusBadge>
                  <StatusBadge tone="success">库存 {product.stock}</StatusBadge>
                </div>
                <h3 style={{ marginTop: 12 }}>
                  <Link href={`/products/${product.id}`}>{product.name}</Link>
                </h3>
                <p>{product.sellingPoint}</p>
                <div className="price-row">
                  <span className="price">{formatMoney(product.priceCents)}</span>
                  <AddCartForm productId={product.id} productName={product.name} stock={product.stock} compact />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <section className="section-head">
        <div>
          <h3>页面状态覆盖</h3>
          <p>当前迭代显式保留加载、空数据和错误状态样式，后续接入真实请求时复用。</p>
        </div>
      </section>
      <div className="grid cols-3">
        <LoadingState />
        <EmptyState label="搜索没有匹配商品" />
        <ErrorState />
      </div>
    </>
  );
}
