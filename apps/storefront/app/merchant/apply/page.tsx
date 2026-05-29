import { Card, StatusBadge } from "@minimal-mall/ui";
import { AccessDenied } from "@/app/components/AccessDenied";
import { ActionForm } from "@/app/components/ActionForm";
import { ImageUploadField } from "@/app/components/ImageUploadField";
import { merchantApplyAction } from "@/lib/actions";
import { listCategories, listCurrentUserMerchantApplications } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";

export default async function MerchantApplyPage() {
  const { user, denied } = await requireSessionUser("customer");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "请先登录", message: "请登录后提交商家开店申请。" })} />;
  const [categories, merchantApplications] = await Promise.all([
    listCategories(),
    listCurrentUserMerchantApplications(user.id)
  ]);
  const pending = merchantApplications.find((item) => item.status === "SUBMITTED");

  return (
    <>
      <div className="page-title">
        <div>
          <h2>商家开店申请</h2>
          <p>商家提交店铺名称、经营类目、介绍和资质图片，进入管理员审核队列。</p>
        </div>
      </div>
      <div className="grid aside">
        <Card className="panel">
          <h3>入驻申请表</h3>
          {pending ? (
            <div className="form-feedback">
              当前已有待审核申请：{pending.storeName}。同一用户同一时间只能存在一个待审核申请。
            </div>
          ) : null}
          <ActionForm action={merchantApplyAction} submitLabel="提交审核">
            <div className="field">
              <label htmlFor="storeName">店铺名称</label>
              <input id="storeName" name="storeName" placeholder="填写店铺名称" required minLength={2} data-required-message="店铺名称至少 2 个字" data-min-length-message="店铺名称至少 2 个字" />
            </div>
            <div className="field">
              <label htmlFor="categoryId">经营类目</label>
              <select id="categoryId" name="categoryId" defaultValue="" required data-required-message="请选择经营类目">
                <option value="" disabled>请选择经营类目</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="description">店铺介绍</label>
              <textarea id="description" name="description" placeholder="介绍主营商品、服务范围和售后承诺" required minLength={8} data-required-message="店铺介绍至少 8 个字" data-min-length-message="店铺介绍至少 8 个字" />
            </div>
            <ImageUploadField
              id="licenseImageUrl"
              name="licenseImageUrl"
              label="资质图片"
              defaultValue=""
              scope="license"
            />
          </ActionForm>
        </Card>
        <aside className="card panel">
          <h3>审核流程</h3>
          <div className="steps">
            <div className="step"><div className="step-index">1</div><div><h4>提交资料</h4><p>表单校验必填字段和资质图片。</p></div></div>
            <div className="step"><div className="step-index">2</div><div><h4>平台审核</h4><p>管理员通过或驳回，驳回必须填写原因。</p></div></div>
            <div className="step"><div className="step-index">3</div><div><h4>开店成功</h4><p>生成店铺并授予商家角色。</p></div></div>
          </div>
          <section className="section-head" style={{ marginTop: 24 }}>
            <div><h3>申请状态</h3></div>
          </section>
          {merchantApplications.map((item) => (
            <div className="row" key={item.id}>
              <div>
                <h4>{item.storeName}</h4>
                <p>{item.submittedAt}</p>
              </div>
              <StatusBadge tone={item.status === "SUBMITTED" ? "warning" : "success"}>{item.status}</StatusBadge>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
