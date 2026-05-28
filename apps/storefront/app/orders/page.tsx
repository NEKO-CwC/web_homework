import Link from "next/link";
import { Card, StatusBadge } from "@minimal-mall/ui";
import { AccessDenied } from "../components/AccessDenied";
import { ActionForm } from "../components/ActionForm";
import { confirmReceiveAction, retryPaymentAction } from "@/lib/actions";
import { listCustomerOrders } from "@/lib/data";
import { badgeToneForOrder, formatMoney, formatOrderStatus } from "@/lib/format";
import { requireSessionUser } from "@/lib/session";

export default async function OrdersPage() {
  const { user, denied } = await requireSessionUser("customer");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "请先登录", message: "请登录后访问订单页。" })} />;
  const orders = await listCustomerOrders(user.id);
  return (
    <>
      <div className="page-title">
        <div>
          <h2>订单 / 虚拟物流</h2>
          <p>展示订单号、商品、状态、运单号、金额、物流时间线和确认收货入口。</p>
        </div>
      </div>
      <Card className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>订单</th>
              <th>商品</th>
              <th>状态</th>
              <th>虚拟运单</th>
              <th>金额</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const product = order.primaryProduct;
              return (
                <tr key={order.id}>
                  <td>{order.orderNo}</td>
                  <td>{product?.name ?? "订单商品"}</td>
                  <td><StatusBadge tone={badgeToneForOrder(order.status)}>{formatOrderStatus(order.status)}</StatusBadge></td>
                  <td>{order.shipment?.trackingNo ?? "待商家生成"}</td>
                  <td>{formatMoney(order.totalAmountCents)}</td>
                  <td>
                    {order.status === "PENDING_PAYMENT" ? (
                      <ActionForm action={retryPaymentAction} submitLabel="继续支付" className="form" variant="secondary">
                        <input type="hidden" name="orderNo" value={order.orderNo} />
                        <input type="hidden" name="paymentMethod" value="balance" />
                      </ActionForm>
                    ) : order.status === "SHIPPED" ? (
                      <ActionForm action={confirmReceiveAction} submitLabel="确认收货" className="form" variant="primary">
                        <input type="hidden" name="orderNo" value={order.orderNo} />
                        <input type="hidden" name="status" value={order.status} />
                      </ActionForm>
                    ) : order.status === "DELIVERED" ? (
                      <Link className="ui-button ui-button--secondary" href="/after-sale">去评价</Link>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>暂无操作</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <section className="section-head">
        <div>
          <h3>物流时间线</h3>
          <p>每个已发货订单至少展示已发货、运输中、待确认收货三个节点。</p>
        </div>
      </section>
      <div className="grid cols-2">
        {orders.filter((order) => order.shipment).map((order) => (
          <Card className="panel" key={order.id}>
            <h3>{order.orderNo}</h3>
            <p style={{ color: "var(--muted)" }}>运单号：{order.shipment?.trackingNo}</p>
            <div className="timeline">
              {order.shipment?.events.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{event.title}</strong>
                    <p style={{ color: "var(--muted)", margin: "4px 0" }}>{event.description}</p>
                    <small>{event.occurredAt}</small>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
