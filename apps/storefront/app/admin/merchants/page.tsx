import { Card, StatusBadge } from "@minimal-mall/ui";
import type { MerchantApplicationStatus, StoreStatus } from "@minimal-mall/types";
import { AccessDenied } from "@/app/components/AccessDenied";
import { ActionForm } from "@/app/components/ActionForm";
import { PaginationControls } from "@/app/components/PaginationControls";
import { merchantReviewAction, storeStatusAction } from "@/lib/actions";
import { listAdminStoresPage, listCategories, listMerchantApplicationsPage } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";

const applicationStatuses: MerchantApplicationStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
const storeStatuses: StoreStatus[] = ["ACTIVE", "FROZEN"];

export default async function AdminMerchantsPage({
  searchParams
}: {
  searchParams?: Promise<{
    applicationStatus?: string;
    applicationPage?: string;
    storeStatus?: string;
    storePage?: string;
  }>;
}) {
  const { denied } = await requireSessionUser("admin");
  if (denied) return <AccessDenied {...denied} />;
  const params = await searchParams;
  const applicationStatus = applicationStatuses.includes(params?.applicationStatus as MerchantApplicationStatus)
    ? params?.applicationStatus as MerchantApplicationStatus
    : "";
  const storeStatus = storeStatuses.includes(params?.storeStatus as StoreStatus)
    ? params?.storeStatus as StoreStatus
    : "";
  const [merchantApplicationsPage, storesPage, categories] = await Promise.all([
    listMerchantApplicationsPage({ status: applicationStatus, page: params?.applicationPage, pageSize: 2 }),
    listAdminStoresPage({ status: storeStatus, page: params?.storePage, pageSize: 2 }),
    listCategories()
  ]);
  const merchantApplications = merchantApplicationsPage.items;
  const stores = storesPage.items;
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "未分类";

  return (
    <>
      <div className="page-title">
        <div>
          <h2>商家审核管理</h2>
          <p>管理员对入驻申请进行通过、驳回，并管理店铺启用、冻结和复核状态。</p>
        </div>
      </div>
      <Card className="panel table-wrap">
        <form className="form grid cols-4" method="get" style={{ marginBottom: 18 }}>
          <div className="field">
            <label htmlFor="applicationStatus">申请状态</label>
            <select id="applicationStatus" name="applicationStatus" defaultValue={applicationStatus}>
              <option value="">全部申请</option>
              <option value="SUBMITTED">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已驳回</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="storeStatus">店铺状态</label>
            <select id="storeStatus" name="storeStatus" defaultValue={storeStatus}>
              <option value="">全部店铺</option>
              <option value="ACTIVE">经营中</option>
              <option value="FROZEN">已冻结</option>
            </select>
          </div>
          <div className="top-actions">
            <button className="ui-button ui-button--secondary" type="submit">筛选商家</button>
          </div>
        </form>
        <table className="table">
          <thead>
            <tr><th>店铺</th><th>类目</th><th>状态</th><th>提交时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            {merchantApplications.map((item) => (
              <tr key={item.id}>
                <td>{item.storeName}</td>
                <td>{categoryName(item.categoryId)}</td>
                <td>
                  <StatusBadge tone={item.status === "SUBMITTED" ? "warning" : item.status === "APPROVED" ? "success" : "danger"}>
                    {item.status}
                  </StatusBadge>
                </td>
                <td>{item.submittedAt}</td>
                <td>
                  {item.status === "SUBMITTED" ? (
                    <div className="grid" style={{ minWidth: 280 }}>
                      <ActionForm action={merchantReviewAction} submitLabel="通过">
                        <input type="hidden" name="action" value="approve" />
                        <input type="hidden" name="applicationId" value={item.id} />
                      </ActionForm>
                      <ActionForm action={merchantReviewAction} submitLabel="驳回" variant="danger">
                        <input type="hidden" name="action" value="reject" />
                        <input type="hidden" name="applicationId" value={item.id} />
                        <div className="field">
                          <label htmlFor={`reason-${item.id}`}>驳回原因</label>
                          <input id={`reason-${item.id}`} name="reason" placeholder="资料不完整" />
                        </div>
                      </ActionForm>
                    </div>
                  ) : (
                    <button className="ui-button ui-button--secondary" type="button">查看</button>
                  )}
                </td>
              </tr>
            ))}
            {stores.map((store) => (
              <tr key={store.id}>
                <td>{store.name}</td>
                <td>{categoryName(store.categoryId)}</td>
                <td><StatusBadge tone={store.status === "ACTIVE" ? "success" : "danger"}>{store.status}</StatusBadge></td>
                <td>已入驻</td>
                <td>
                  <div className="top-actions">
                    <ActionForm
                      action={storeStatusAction}
                      submitLabel={store.status === "ACTIVE" ? "冻结" : "恢复"}
                      variant={store.status === "ACTIVE" ? "danger" : "secondary"}
                      className="inline-form"
                    >
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="status" value={store.status === "ACTIVE" ? "FROZEN" : "ACTIVE"} />
                    </ActionForm>
                    <ActionForm action={storeStatusAction} submitLabel="复核" variant="ghost" className="inline-form">
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="status" value={store.status} />
                    </ActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid cols-2" style={{ marginTop: 18 }}>
          <PaginationControls
            basePath="/admin/merchants"
            page={merchantApplicationsPage.page}
            pageCount={merchantApplicationsPage.pageCount}
            total={merchantApplicationsPage.total}
            pageParam="applicationPage"
            params={{ applicationStatus, storeStatus, applicationPage: merchantApplicationsPage.page }}
          />
          <PaginationControls
            basePath="/admin/merchants"
            page={storesPage.page}
            pageCount={storesPage.pageCount}
            total={storesPage.total}
            pageParam="storePage"
            params={{ applicationStatus, storeStatus, storePage: storesPage.page }}
          />
        </div>
      </Card>
    </>
  );
}
