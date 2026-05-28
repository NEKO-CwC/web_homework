import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingCart, Store } from "lucide-react";
import { Card, StatusBadge } from "@minimal-mall/ui";
import { AddCartForm } from "./components/AddCartForm";
import { EmptyState } from "./components/PageState";
import { listCategories, listDiscoverProducts, listHomeBanners, listStores, searchDiscoverProducts } from "@/lib/data";
import { formatMoney } from "@/lib/format";

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  const selectedCategoryName = params?.category;
  const keyword = params?.q?.trim() ?? "";
  const [products, categories, homeBanners, stores] = await Promise.all([
    keyword ? searchDiscoverProducts(keyword) : listDiscoverProducts(),
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
            <p>{hero?.subtitle ?? "精选智能台灯、收纳与办公配件。"} 从桌面收纳到通勤配件，挑选更适合日常生活的实用好物。</p>
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
              <strong>今日推荐</strong>
              <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                热门单品、精选店铺和限时上新，为你的桌面、通勤与居家场景补齐细节。
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
          <h3>分类与搜索</h3>
          <p>按类目浏览上新商品，也可以直接搜索商品名、卖点或店铺。</p>
        </div>
      </section>
      <form className="form grid cols-4" method="get" action="/#products" style={{ marginBottom: 18 }}>
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label htmlFor="discover-q">搜索商品</label>
          <input id="discover-q" name="q" defaultValue={keyword} placeholder="商品名、卖点或店铺名" />
        </div>
        {selectedCategory ? <input type="hidden" name="category" value={selectedCategory.name} /> : null}
        <div className="top-actions">
          <button className="ui-button ui-button--secondary" type="submit">搜索</button>
          {keyword ? <Link className="ui-button ui-button--ghost" href={selectedCategory ? `/?category=${encodeURIComponent(selectedCategory.name)}#products` : "/#products"}>清除</Link> : null}
        </div>
      </form>
      <div className="grid cols-3">
        <Link className={`metric filter-card ${selectedCategory ? "" : "active"}`} href={keyword ? `/?q=${encodeURIComponent(keyword)}#products` : "/#products"}>
          <div className="num">{products.length}</div>
          <div className="label">全部商品</div>
        </Link>
        {categories.map((category) => (
          <Link
            className={`metric filter-card ${selectedCategory?.id === category.id ? "active" : ""}`}
            href={`/?category=${encodeURIComponent(category.name)}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}#products`}
            key={category.id}
          >
            <div className="num">{products.filter((product) => product.categoryId === category.id).length}</div>
            <div className="label">{category.name}</div>
          </Link>
        ))}
      </div>

      <section className="section-head" id="products">
        <div>
          <h3>{keyword ? `“${keyword}”搜索结果` : selectedCategory ? `${selectedCategory.name}商品` : "精选商品"}</h3>
          <p>{selectedCategory ? `${selectedCategory.name}分类 · ` : ""}查看价格、库存和店铺信息，喜欢的商品可以直接加入购物车。</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/cart">
          <ShoppingCart size={16} /> 购物车
        </Link>
      </section>
      {visibleProducts.length === 0 ? <EmptyState label={keyword ? "搜索没有匹配商品" : "暂无可购买商品"} /> : null}
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
          <h3>服务保障</h3>
          <p>围绕在线购物的核心体验，提供订单跟踪、售后申请和商家入驻能力。</p>
        </div>
      </section>
      <div className="grid cols-3">
        <Card className="panel">
          <h3>虚拟物流</h3>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>下单后可在订单页查看运单号和物流进度。</p>
        </Card>
        <Card className="panel">
          <h3>评价售后</h3>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>收货后可评价商品，也能提交退换货申请。</p>
        </Card>
        <Card className="panel">
          <h3>商家入驻</h3>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>有自己的商品和店铺资料，可以申请成为平台商家。</p>
          <Link className="ui-button ui-button--secondary" href="/merchant/apply">
            <Store size={16} /> 申请开店
          </Link>
        </Card>
      </div>
    </>
  );
}
