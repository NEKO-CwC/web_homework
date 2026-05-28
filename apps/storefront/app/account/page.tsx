import { Card, StatusBadge } from "@minimal-mall/ui";
import { ActionForm } from "../components/ActionForm";
import { loginAction, logoutAction, registerAction, saveProfileAction } from "@/lib/actions";
import { getCurrentCustomerProfile } from "@/lib/data";
import { getCurrentSessionUser } from "@/lib/session";

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const status = (await searchParams)?.status;
  const sessionUser = await getCurrentSessionUser();
  const currentCustomer = await getCurrentCustomerProfile(sessionUser?.id);

  return (
    <>
      <div className="page-title">
        <div>
          <h2>注册登录 / 个人信息</h2>
          <p>覆盖账号登录、会员注册入口、资料维护、默认地址带入结算页。</p>
        </div>
      </div>
      <div className="grid cols-2">
        <Card className="panel">
          <div className="tabs">
            <button className="tab active" type="button">登录</button>
            <button className="tab" type="button">注册会员</button>
          </div>
          {status === "logged-out" ? (
            <div className="form-feedback success" role="status" aria-live="polite" style={{ marginBottom: 14 }}>
              已退出登录
            </div>
          ) : null}
          {sessionUser ? (
            <div className="form-feedback success" style={{ marginBottom: 14 }}>
              当前已登录：{sessionUser.email ?? sessionUser.phone ?? sessionUser.id}
            </div>
          ) : null}
          <ActionForm action={loginAction} submitLabel="进入商城">
            <div className="field">
              <label htmlFor="account">手机号 / 邮箱</label>
              <input id="account" name="account" defaultValue={currentCustomer.email} />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input id="password" name="password" type="password" defaultValue="12345678" />
            </div>
          </ActionForm>
          <div style={{ marginTop: 18 }}>
            <ActionForm action={registerAction} submitLabel="注册会员" variant="secondary">
              <div className="field">
                <label htmlFor="registerAccount">手机号 / 邮箱</label>
                <input id="registerAccount" name="account" defaultValue="new-customer@example.com" />
              </div>
              <div className="field">
                <label htmlFor="registerPassword">密码</label>
                <input id="registerPassword" name="password" type="password" defaultValue="12345678" />
              </div>
              <div className="field">
                <label htmlFor="registerNickname">昵称</label>
                <input id="registerNickname" name="nickname" defaultValue="新会员" />
              </div>
              <div className="field">
                <label htmlFor="registerPhone">联系电话</label>
                <input id="registerPhone" name="contactPhone" defaultValue="13800000009" />
              </div>
              <div className="field">
                <label htmlFor="registerAddress">默认地址</label>
                <textarea id="registerAddress" name="defaultAddress" defaultValue="江西省南昌市红谷滩区学府大道 999 号" />
              </div>
            </ActionForm>
          </div>
          <div className="steps" style={{ marginTop: 18 }}>
            <div className="step"><div className="step-index">1</div><div><h4>游客</h4><p>可浏览首页、商品列表和详情。</p></div></div>
            <div className="step"><div className="step-index">2</div><div><h4>顾客</h4><p>可访问购物车、订单、评价和售后。</p></div></div>
              <div className="step"><div className="step-index">3</div><div><h4>角色隔离</h4><p>商家与管理员页面需要对应角色。</p></div></div>
            </div>
          {sessionUser ? (
            <div style={{ marginTop: 18 }}>
              <ActionForm action={logoutAction} submitLabel="退出登录" variant="ghost" className="inline-form">
                <input type="hidden" name="logout" value="1" />
              </ActionForm>
            </div>
          ) : null}
        </Card>

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
      </div>
    </>
  );
}
