import { Card, StatusBadge } from "@minimal-mall/ui";
import { ActionForm } from "../components/ActionForm";
import { AccessDenied } from "../components/AccessDenied";
import { checkoutAction } from "@/lib/actions";
import { getCurrentCustomerProfile, getDirectCheckoutLine, listCartItems } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { requireSessionUser } from "@/lib/session";

type CheckoutSearchParams = {
  productId?: string | string[];
  quantity?: string | string[];
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDirectQuantity(value?: string | string[]) {
  const parsed = Number(firstSearchParam(value) ?? "1");
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.trunc(parsed));
}

export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<CheckoutSearchParams> }) {
  const { user, denied } = await requireSessionUser("customer");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "请先登录", message: "请登录后访问结算页。" })} />;
  const resolvedSearchParams = await searchParams;
  const directProductId = firstSearchParam(resolvedSearchParams?.productId);
  const directQuantity = parseDirectQuantity(resolvedSearchParams?.quantity);
  const [lines, currentCustomer] = await Promise.all([
    directProductId
      ? getDirectCheckoutLine(directProductId, directQuantity).then((line) => line ? [line] : [])
      : listCartItems(user.id),
    getCurrentCustomerProfile(user.id)
  ]);
  const subtotal = lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const discount = subtotal > 30000 ? 4000 : 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <>
      <div className="page-title">
        <div>
          <h2>结算 / 虚拟支付</h2>
          <p>确认地址、支付方式和履约步骤，提交后生成订单与虚拟支付流水。</p>
        </div>
      </div>
      <div className="grid aside">
        <Card className="panel">
          <h3>收货信息</h3>
          <ActionForm action={checkoutAction} submitLabel="确认虚拟支付">
            {directProductId ? (
              <>
                <input type="hidden" name="productId" value={directProductId} />
                <input type="hidden" name="quantity" value={directQuantity} />
              </>
            ) : null}
            <div className="field">
              <label htmlFor="receiver">收货人</label>
              <input id="receiver" name="receiver" defaultValue={currentCustomer.nickname} />
            </div>
            <div className="field">
              <label htmlFor="phone">联系电话</label>
              <input id="phone" name="phone" defaultValue={currentCustomer.phone} />
            </div>
            <div className="field">
              <label htmlFor="address">默认地址</label>
              <textarea id="address" name="address" defaultValue={currentCustomer.defaultAddress} />
            </div>
            <div className="field">
              <label htmlFor="paymentMethod">虚拟支付方式</label>
              <select id="paymentMethod" name="paymentMethod" defaultValue="balance">
                <option value="balance">虚拟余额</option>
                <option value="card">课程演示卡</option>
                <option value="fail">模拟支付失败</option>
              </select>
            </div>
          </ActionForm>
        </Card>
        <aside className="card panel">
          <div className="top-actions" style={{ justifyContent: "space-between" }}>
            <h3>订单确认</h3>
            {directProductId ? <StatusBadge tone="accent">立即购买</StatusBadge> : null}
          </div>
          {lines.map((line) => (
            <div className="row" key={line.id}>
              <div>
                <h4>{line.product.name}</h4>
                <p>{line.quantity} 件 · {formatMoney(line.product.priceCents)}</p>
              </div>
              <strong>{formatMoney(line.quantity * line.product.priceCents)}</strong>
            </div>
          ))}
          {lines.length === 0 ? (
            <div className="empty-state">
              {directProductId ? "商品不可购买或库存不足，无法生成立即购买订单。" : "购物车为空，无法生成结算订单。"}
            </div>
          ) : null}
          <div className="row"><span>应付合计</span><strong>{formatMoney(total)}</strong></div>
          <div className="steps" style={{ marginTop: 18 }}>
            <div className="step"><div className="step-index">1</div><div><h4>生成订单</h4><p>写入订单、订单项和地址快照。</p></div></div>
            <div className="step"><div className="step-index">2</div><div><h4>虚拟支付</h4><p>成功后订单进入待发货。</p></div></div>
            <div className="step"><div className="step-index">3</div><div><h4>商家发货</h4><p>生成 VL-0000-0000 格式运单。</p></div></div>
          </div>
          <StatusBadge tone="success" style={{ marginTop: 16 }}>支付服务正常</StatusBadge>
        </aside>
      </div>
    </>
  );
}
