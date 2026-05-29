import { Card, StatusBadge } from "@minimal-mall/ui";
import { ActionForm } from "../components/ActionForm";
import { logoutAction, saveProfileAction } from "@/lib/actions";
import { getCurrentCustomerProfile } from "@/lib/data";
import { getCurrentSessionUser } from "@/lib/session";
import { AccountAuthPanel } from "./AccountAuthPanel";

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const status = (await searchParams)?.status;
  const sessionUser = await getCurrentSessionUser();
  const currentCustomer = sessionUser?.role === "CUSTOMER"
    ? await getCurrentCustomerProfile(sessionUser.id)
    : null;
  const accountLabel = sessionUser?.email ?? sessionUser?.phone ?? sessionUser?.id;

  return (
    <>
      <div className="page-title">
        <div>
          <h2>{sessionUser ? "我的账号" : "登录 / 注册"}</h2>
          <p>{sessionUser ? "管理当前登录账号和常用资料。" : "登录后可以查看订单、管理地址并继续购物。"}</p>
        </div>
      </div>
      <div className="grid cols-2">
        <Card className="panel">
          {status === "logged-out" ? (
            <div className="form-feedback success" role="status" aria-live="polite" style={{ marginBottom: 14 }}>
              已退出登录
            </div>
          ) : null}
          {sessionUser ? (
            <div className="account-summary">
              <div className="top-actions" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3>当前账号</h3>
                  <p>{accountLabel}</p>
                </div>
                <StatusBadge tone="success">
                  {sessionUser.role === "CUSTOMER" ? "顾客账号" : sessionUser.role === "MERCHANT" ? "商家账号" : "管理员账号"}
                </StatusBadge>
              </div>
              <ActionForm action={logoutAction} submitLabel="退出登录" variant="ghost" className="inline-form">
                <input type="hidden" name="logout" value="1" />
              </ActionForm>
            </div>
          ) : (
            <AccountAuthPanel />
          )}
        </Card>

        {currentCustomer ? (
          <Card className="panel">
            <div className="top-actions" style={{ justifyContent: "space-between" }}>
              <h3>个人信息</h3>
              <StatusBadge tone="success">顾客账号</StatusBadge>
            </div>
            <ActionForm action={saveProfileAction} submitLabel="保存资料" variant="secondary">
              <div className="field">
                <label htmlFor="nickname">昵称</label>
                <input id="nickname" name="nickname" defaultValue={currentCustomer.nickname} />
              </div>
              <div className="field">
                <label htmlFor="contactPhone">联系电话</label>
                <input id="contactPhone" name="contactPhone" defaultValue={currentCustomer.phone} />
              </div>
              <div className="field">
                <label htmlFor="defaultAddress">默认地址</label>
                <textarea id="defaultAddress" name="defaultAddress" defaultValue={currentCustomer.defaultAddress} />
              </div>
            </ActionForm>
          </Card>
        ) : (
          <Card className="panel">
            <h3>{sessionUser ? "资料管理" : "会员权益"}</h3>
            {sessionUser ? (
              <p className="muted-copy">当前账号不属于顾客身份，不显示顾客个人资料。需要维护顾客资料时请切换到顾客账号。</p>
            ) : (
              <div className="steps">
                <div className="step"><div className="step-index">1</div><div><h4>保存常用地址</h4><p>下单时自动带入收货信息。</p></div></div>
                <div className="step"><div className="step-index">2</div><div><h4>查看订单进度</h4><p>登录后可查看物流、评价和售后记录。</p></div></div>
                <div className="step"><div className="step-index">3</div><div><h4>继续购物</h4><p>购物车和结算会跟随你的账号同步。</p></div></div>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
