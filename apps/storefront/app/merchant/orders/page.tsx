import { Card, StatusBadge } from "@minimal-mall/ui";
import type { AfterSaleStatus, OrderStatus } from "@minimal-mall/types";
import { AccessDenied } from "@/app/components/AccessDenied";
import { ActionForm } from "@/app/components/ActionForm";
import { PaginationControls } from "@/app/components/PaginationControls";
import { createShipmentAction, handleAfterSaleAction } from "@/lib/actions";
import { getActiveMerchantStore, getMerchantStats, listMerchantAfterSalesPage, listMerchantOrdersPage } from "@/lib/data";
import { badgeToneForOrder, formatAfterSaleStatus, formatAfterSaleType, formatMoney, formatOrderStatus } from "@/lib/format";
import { requireSessionUser } from "@/lib/session";
import { canCreateShipmentForOrder } from "./view-model";

const orderStatuses: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "TO_SHIP", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "AFTER_SALE"];
const afterSaleStatuses: AfterSaleStatus[] = ["REQUESTED", "APPROVED", "RETURNING", "REFUNDED", "REJECTED", "CLOSED"];

export default async function MerchantOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{
    orderStatus?: string;
    orderPage?: string;
    afterSaleStatus?: string;
    afterSalePage?: string;
  }>;
}) {
  const { user, denied } = await requireSessionUser("merchant");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "403 无权访问", message: "当前账号无权访问商家中台。" })} />;
  const params = await searchParams;
  const orderStatus = orderStatuses.includes(params?.orderStatus as OrderStatus)
    ? params?.orderStatus as OrderStatus
    : "";
  const afterSaleStatus = afterSaleStatuses.includes(params?.afterSaleStatus as AfterSaleStatus)
    ? params?.afterSaleStatus as AfterSaleStatus
    : "";
  const store = await getActiveMerchantStore(user.id);
  if (!store) {
    return (
      <AccessDenied
        title="暂无店铺"
        message="当前账号还没有可处理订单的店铺，请先完成商家入驻审核。"
      />
    );
  }
  const [merchantOrdersPage, afterSalesPage, stats] = await Promise.all([
    listMerchantOrdersPage(store.id, { status: orderStatus, page: params?.orderPage, pageSize: 2 }),
    listMerchantAfterSalesPage(store.id, { status: afterSaleStatus, page: params?.afterSalePage, pageSize: 2 }),
    getMerchantStats(store.id)
  ]);
  const merchantOrders = merchantOrdersPage.items;
  const afterSales = afterSalesPage.items;

  return (
    <>
      <div className="page-title">
        <div>
          <h2>商家销售 / 物流 / 售后</h2>
          <p>商家查看自己店铺订单，生成虚拟运单，并处理顾客退换货申请。</p>
        </div>
      </div>
      <div className="grid cols-3">
        <Card className="metric"><div className="num">{stats.toShipCount}</div><div className="label">待发货订单</div></Card>
        <Card className="metric"><div className="num">{stats.afterSaleCount}</div><div className="label">售后待处理</div></Card>
        <Card className="metric"><div className="num">{formatMoney(stats.monthSalesCents)}</div><div className="label">本月虚拟销售额</div></Card>
      </div>

      <section className="section-head">
        <div><h3>订单处理</h3><p>仅待发货订单可生成运单，同一订单不能重复生成有效运单。</p></div>
      </section>
      <Card className="panel table-wrap">
        <form className="form grid cols-4" method="get" style={{ marginBottom: 18 }}>
          <div className="field">
            <label htmlFor="orderStatus">订单状态</label>
            <select id="orderStatus" name="orderStatus" defaultValue={orderStatus}>
              <option value="">全部状态</option>
              <option value="TO_SHIP">待发货</option>
              <option value="SHIPPED">运输中</option>
              <option value="DELIVERED">已收货</option>
              <option value="AFTER_SALE">售后中</option>
              <option value="COMPLETED">已完成</option>
            </select>
          </div>
          <input type="hidden" name="afterSaleStatus" value={afterSaleStatus} />
          <div className="top-actions">
            <button className="ui-button ui-button--secondary" type="submit">筛选订单</button>
          </div>
        </form>
        <table className="table">
          <thead>
            <tr><th>订单</th><th>顾客</th><th>商品</th><th>状态</th><th>虚拟运单</th><th>操作</th></tr>
          </thead>
          <tbody>
            {merchantOrders.map((order) => {
              const product = order.primaryProduct;
              return (
                <tr key={order.id}>
                  <td>{order.orderNo}</td>
                  <td>{order.customerName}</td>
                  <td>{product?.name ?? "商品"}</td>
                  <td><StatusBadge tone={badgeToneForOrder(order.status)}>{formatOrderStatus(order.status)}</StatusBadge></td>
                  <td>{order.shipment?.trackingNo ?? "待生成"}</td>
                  <td>
                    {canCreateShipmentForOrder(order) ? (
                      <ActionForm action={createShipmentAction} submitLabel="生成运单">
                        <input type="hidden" name="orderNo" value={order.orderNo} />
                        <input type="hidden" name="storeId" value={store.id} />
                        <input type="hidden" name="status" value={order.status} />
                      </ActionForm>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>
                        {order.shipment?.trackingNo ? "已生成运单" : "当前状态无需发货"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <PaginationControls
          basePath="/merchant/orders"
          page={merchantOrdersPage.page}
          pageCount={merchantOrdersPage.pageCount}
          total={merchantOrdersPage.total}
          pageParam="orderPage"
          params={{ orderStatus, afterSaleStatus, orderPage: merchantOrdersPage.page }}
        />
      </Card>

      <section className="section-head">
        <div><h3>售后处理</h3><p>处理结果同步给顾客订单，并记录操作日志。</p></div>
      </section>
      <Card className="panel" style={{ marginBottom: 16 }}>
        <form className="form grid cols-4" method="get">
          <div className="field">
            <label htmlFor="afterSaleStatus">售后状态</label>
            <select id="afterSaleStatus" name="afterSaleStatus" defaultValue={afterSaleStatus}>
              <option value="">全部状态</option>
              <option value="REQUESTED">待处理</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已驳回</option>
              <option value="CLOSED">已关闭</option>
            </select>
          </div>
          <input type="hidden" name="orderStatus" value={orderStatus} />
          <div className="top-actions">
            <button className="ui-button ui-button--secondary" type="submit">筛选售后</button>
          </div>
        </form>
      </Card>
      <div className="grid cols-2">
        {afterSales.map((item) => (
          <Card className="panel" key={item.id}>
            <div className="top-actions" style={{ justifyContent: "space-between" }}>
              <h3>{formatAfterSaleType(item.type)}</h3>
              <StatusBadge tone="warning">{formatAfterSaleStatus(item.status)}</StatusBadge>
            </div>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>{item.reason}：{item.description}</p>
            {item.evidenceUrl ? (
              <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>凭证：{item.evidenceUrl}</p>
            ) : null}
            {item.merchantReply ? (
              <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>处理说明：{item.merchantReply}</p>
            ) : null}
            {item.status === "REQUESTED" ? (
              <ActionForm action={handleAfterSaleAction} submitLabel="提交处理" variant="secondary">
                <input type="hidden" name="afterSaleId" value={item.id} />
                <div className="field">
                  <label htmlFor={`action-${item.id}`}>处理结果</label>
                  <select id={`action-${item.id}`} name="action" defaultValue="approve">
                    <option value="approve">通过售后</option>
                    <option value="reject">驳回售后</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`reply-${item.id}`}>处理说明</label>
                  <textarea id={`reply-${item.id}`} name="reply" defaultValue="同意换货，请顾客保持包装完整并等待虚拟退回单。" />
                </div>
              </ActionForm>
            ) : (
              <button className="ui-button ui-button--secondary" type="button" disabled>已处理</button>
            )}
          </Card>
        ))}
      </div>
      <PaginationControls
        basePath="/merchant/orders"
        page={afterSalesPage.page}
        pageCount={afterSalesPage.pageCount}
        total={afterSalesPage.total}
        pageParam="afterSalePage"
        params={{ orderStatus, afterSaleStatus, afterSalePage: afterSalesPage.page }}
      />
    </>
  );
}
