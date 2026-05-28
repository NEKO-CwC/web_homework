import { Card, StatusBadge } from "@minimal-mall/ui";
import { canCreateAfterSale } from "@minimal-mall/auth";
import { AccessDenied } from "../components/AccessDenied";
import { ActionForm } from "../components/ActionForm";
import { ImageUploadField } from "../components/ImageUploadField";
import { afterSaleAction, reviewAction } from "@/lib/actions";
import { listAfterSales, listCustomerOrders } from "@/lib/data";
import { formatAfterSaleStatus, formatAfterSaleType, formatOrderStatus } from "@/lib/format";
import { requireSessionUser } from "@/lib/session";

export default async function AfterSalePage() {
  const { user, denied } = await requireSessionUser("customer");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "请先登录", message: "请登录后访问评价和售后页。" })} />;
  const [orders, afterSales] = await Promise.all([
    listCustomerOrders(user.id),
    listAfterSales(user.id)
  ]);
  const deliveredItems = orders.flatMap((order) =>
    order.itemsWithProducts.map((item) => ({ order, item, product: item.product }))
  );
  const openAfterSaleItemIds = new Set(
    afterSales
      .filter((item) => !["REJECTED", "CLOSED"].includes(item.status))
      .map((item) => item.orderItemId)
  );
  const afterSaleItems = deliveredItems.map(({ order, item, product }) => ({
    order,
    item,
    product,
    canSubmit: canCreateAfterSale(order.status) && !openAfterSaleItemIds.has(item.id)
  }));
  const defaultAfterSaleItemId = afterSaleItems.find(({ canSubmit }) => canSubmit)?.item.id;

  return (
    <>
      <div className="page-title">
        <div>
          <h2>评价 / 退换货</h2>
          <p>已收货订单可评价，售后申请进入商家中台待处理列表。</p>
        </div>
      </div>
      <div className="grid cols-2">
        <Card className="panel">
          <div className="tabs">
            <button className="tab active" type="button">提交评价</button>
            <button className="tab" type="button">重复评价禁用</button>
          </div>
          <ActionForm action={reviewAction} submitLabel="提交评价">
            <div className="field">
              <label htmlFor="orderItemId">选择订单商品</label>
              <select id="orderItemId" name="orderItemId" defaultValue={deliveredItems.find(({ order, item }) => order.status === "DELIVERED" && !item.reviewed)?.item.id} required data-required-message="请选择订单">
                {deliveredItems.map(({ order, item, product }) => (
                  <option key={item.id} value={item.id} disabled={item.reviewed || order.status !== "DELIVERED"}>
                    {order.orderNo} · {product?.name ?? "商品"} · {formatOrderStatus(order.status)}{item.reviewed ? " · 已评价" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rating">评分</label>
              <select id="rating" name="rating" defaultValue="5" required data-required-message="请选择评分">
                <option value="5">5 分</option>
                <option value="4">4 分</option>
                <option value="3">3 分</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="content">评价内容</label>
              <textarea id="content" name="content" defaultValue="配送很快，商品质感符合预期。" required minLength={4} data-required-message="评价内容至少 4 个字" data-min-length-message="评价内容至少 4 个字" />
            </div>
          </ActionForm>
        </Card>

        <Card className="panel">
          <div className="tabs">
            <button className="tab active" type="button">发起售后</button>
            <button className="tab" type="button">凭证可选</button>
          </div>
          <ActionForm action={afterSaleAction} submitLabel="发起售后" variant="danger">
            <div className="field">
              <label htmlFor="afterOrderItemId">选择订单商品</label>
              <select id="afterOrderItemId" name="orderItemId" defaultValue={defaultAfterSaleItemId} required data-required-message="请选择订单商品">
                {afterSaleItems.map(({ order, item, product, canSubmit }) => (
                  <option key={item.id} value={item.id} disabled={!canSubmit}>
                    {order.orderNo} · {product?.name ?? "商品"}{canSubmit ? "" : " · 暂不可申请"}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="type">售后类型</label>
              <select id="type" name="type" defaultValue="EXCHANGE" required data-required-message="请选择售后类型">
                <option value="REFUND">仅退款</option>
                <option value="RETURN_REFUND">退货退款</option>
                <option value="EXCHANGE">换货</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="reason">原因</label>
              <input id="reason" name="reason" defaultValue="颜色与预期不符" required minLength={2} data-required-message="请选择或填写原因" data-min-length-message="请选择或填写原因" />
            </div>
            <div className="field">
              <label htmlFor="description">说明</label>
              <textarea id="description" name="description" defaultValue="希望换成黑色款，包装和吊牌完整。" required minLength={4} data-required-message="说明至少 4 个字" data-min-length-message="说明至少 4 个字" />
            </div>
            <ImageUploadField
              id="evidenceUrl"
              name="evidenceUrl"
              label="凭证图片"
              defaultValue=""
              scope="evidence"
            />
          </ActionForm>
        </Card>
      </div>

      <section className="section-head">
        <div>
          <h3>售后记录</h3>
          <p>顾客提交后状态为 REQUESTED，商家中台可处理。</p>
        </div>
      </section>
      <Card className="panel">
        {afterSales.map((item) => (
          <div className="row" key={item.id}>
            <div>
              <h4>{formatAfterSaleType(item.type)} · {item.reason}</h4>
              <p>{item.description}</p>
              {item.evidenceUrl ? <p>凭证：{item.evidenceUrl}</p> : null}
              {item.merchantReply ? <p>商家处理：{item.merchantReply}</p> : null}
            </div>
            <StatusBadge tone="warning">{formatAfterSaleStatus(item.status)}</StatusBadge>
          </div>
        ))}
      </Card>
    </>
  );
}
