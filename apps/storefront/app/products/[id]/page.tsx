import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ShoppingBag, Star } from "lucide-react";
import { Card, StatusBadge } from "@minimal-mall/ui";
import { AddCartForm } from "@/app/components/AddCartForm";
import { findProductDetail } from "@/lib/data";
import { formatMoney, visibleReviewCount } from "@/lib/format";

export function generateStaticParams() {
  return [
    { id: "prod-lamp" },
    { id: "prod-headphone" },
    { id: "prod-charger" },
    { id: "prod-speaker" },
    { id: "prod-storage" },
    { id: "prod-aroma" },
    { id: "prod-bedding" },
    { id: "prod-cardcase" },
    { id: "prod-tote" }
  ];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await findProductDetail(id);
  if (!detail) notFound();
  const { product, store, category, reviews: productReviews } = detail;
  const canBuy = product.status === "ACTIVE" && product.stock > 0 && store?.status === "ACTIVE";

  return (
    <>
      <div className="page-title">
        <div>
          <h2>商品详情</h2>
          <p>展示主图区域、商品信息卡、价格、库存、参数、评分、加入购物车和立即购买。</p>
        </div>
      </div>
      <div className="detail-layout">
        <div className="detail-art" data-label={product.name}>
          <Image
            src={product.imageUrl}
            alt={`${product.name} 商品主图`}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 46vw"
            className="media-image detail-image"
          />
          <div className="floating-spec">
            <div className="spec"><b>{product.rating}</b><span>综合评分</span></div>
            <div className="spec"><b>{product.stock}</b><span>库存</span></div>
            <div className="spec"><b>{category?.name}</b><span>分类</span></div>
          </div>
        </div>
        <div className="grid">
          <Card className="panel">
            <div className="top-actions" style={{ justifyContent: "space-between" }}>
              <StatusBadge tone={canBuy ? "success" : "danger"}>{canBuy ? "可购买" : "不可购买"}</StatusBadge>
              <StatusBadge tone="accent">{store?.name}</StatusBadge>
            </div>
            <h2 style={{ fontSize: 42, letterSpacing: "-.04em", margin: "18px 0 10px" }}>{product.name}</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>{product.description}</p>
            <div className="price" style={{ fontSize: 34, margin: "20px 0" }}>{formatMoney(product.priceCents)}</div>
            <div className="top-actions" style={{ marginBottom: 18 }}>
              <Star size={18} fill="currentColor" />
              <span>{product.rating} 分 · {visibleReviewCount(product.reviewCount, productReviews.length)} 条评价</span>
            </div>
            {canBuy ? (
              <div className="top-actions">
                <AddCartForm productId={product.id} productName={product.name} stock={product.stock} />
                <Link className="ui-button ui-button--secondary" href={`/checkout?productId=${encodeURIComponent(product.id)}&quantity=1`}>
                  <ShoppingBag size={16} /> 立即购买
                </Link>
              </div>
            ) : (
              <div className="form-feedback danger">库存不足或店铺冻结，当前商品禁止购买。</div>
            )}
          </Card>

          <Card className="panel">
            <h3>商品参数</h3>
            {Object.entries(product.parameters).map(([key, value]) => (
              <div className="row" key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </Card>

          <Card className="panel">
            <h3>评价列表</h3>
            {productReviews.length > 0 ? (
              productReviews.map((review) => (
                <div className="row" key={review.id}>
                  <div>
                    <h4>{review.rating} 星评价</h4>
                    <p>{review.content}</p>
                  </div>
                  <StatusBadge>{review.createdAt}</StatusBadge>
                </div>
              ))
            ) : (
              <div className="empty-state">暂无评价，已收货订单可提交首条评价。</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
