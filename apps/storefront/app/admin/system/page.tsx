import { Card, StatusBadge } from "@minimal-mall/ui";
import { AccessDenied } from "@/app/components/AccessDenied";
import { ActionForm } from "@/app/components/ActionForm";
import { PaginationControls } from "@/app/components/PaginationControls";
import type { AuditLogFilters } from "@/lib/data";
import { systemSettingAction } from "@/lib/actions";
import { listAuditLogsPage, listSystemServiceStatuses, listSystemSettings } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";

export default async function AdminSystemPage({
  searchParams
}: {
  searchParams?: Promise<{
    actorRole?: string;
    targetType?: string;
    result?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    auditPage?: string;
  }>;
}) {
  const { denied } = await requireSessionUser("admin");
  if (denied) return <AccessDenied {...denied} />;
  const params = await searchParams;
  const filters: AuditLogFilters = {
    actorRole: params?.actorRole === "ADMIN" || params?.actorRole === "MERCHANT" || params?.actorRole === "CUSTOMER"
      ? params.actorRole
      : "",
    targetType: params?.targetType ?? "",
    result: params?.result ?? "",
    keyword: params?.keyword ?? "",
    startDate: params?.startDate ?? "",
    endDate: params?.endDate ?? "",
    page: params?.auditPage,
    pageSize: 2
  };
  const [settings, serviceStatuses, auditLogsPage] = await Promise.all([
    listSystemSettings(),
    listSystemServiceStatuses(),
    listAuditLogsPage(filters)
  ]);
  const auditLogs = auditLogsPage.items;
  return (
    <>
      <div className="page-title">
        <div>
          <h2>系统维护</h2>
          <p>查看虚拟支付、虚拟运单服务状态，维护会员注册、商家审核和首页缓存配置。</p>
        </div>
      </div>
      <div className="grid cols-3">
        {serviceStatuses.map((status) => (
          <Card className="panel" key={status.key}>
            <h3>{status.title}</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>{status.description}</p>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <dl className="service-metrics" aria-label={`${status.title}服务指标`}>
              {status.details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      <section className="section-head">
        <div><h3>系统配置</h3><p>每个配置按钮都有明确成功或失败反馈。</p></div>
      </section>
      <Card className="panel">
        {settings.map((setting) => (
          <div className="row" key={setting.key}>
            <div>
              <h4>{setting.description}</h4>
              <p>当前值：{setting.value}</p>
            </div>
            <ActionForm action={systemSettingAction} submitLabel={setting.key === "homeCacheVersion" ? "刷新缓存" : "保存配置"} variant="secondary">
              <input type="hidden" name="key" value={setting.key} />
              {setting.key === "memberRegistration" ? (
                <div className="field">
                  <label htmlFor={`${setting.key}-value`}>配置值</label>
                  <select id={`${setting.key}-value`} name="value" defaultValue={setting.value}>
                    <option value="enabled">允许注册</option>
                    <option value="disabled">暂停注册</option>
                  </select>
                </div>
              ) : setting.key === "merchantManualReview" ? (
                <div className="field">
                  <label htmlFor={`${setting.key}-value`}>配置值</label>
                  <select id={`${setting.key}-value`} name="value" defaultValue={setting.value}>
                    <option value="required">人工审核</option>
                    <option value="auto">自动通过</option>
                  </select>
                </div>
              ) : (
                <input type="hidden" name="value" value={setting.value} />
              )}
            </ActionForm>
          </div>
        ))}
      </Card>

      <section className="section-head">
        <div><h3>审计日志</h3><p>记录操作者、角色、动作、对象、结果和时间。</p></div>
      </section>
      <Card className="panel table-wrap">
        <form className="form grid cols-4" method="get" style={{ marginBottom: 18 }}>
          <div className="field">
            <label htmlFor="actorRole">角色</label>
            <select id="actorRole" name="actorRole" defaultValue={filters.actorRole}>
              <option value="">全部角色</option>
              <option value="ADMIN">管理员</option>
              <option value="MERCHANT">商家</option>
              <option value="CUSTOMER">顾客</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="targetType">对象类型</label>
            <select id="targetType" name="targetType" defaultValue={filters.targetType}>
              <option value="">全部对象</option>
              <option value="MerchantApplication">商家申请</option>
              <option value="User">用户登录</option>
              <option value="Order">订单</option>
              <option value="AfterSaleRequest">售后</option>
              <option value="Store">店铺</option>
              <option value="HomeBanner">首页广告</option>
              <option value="SystemSetting">系统配置</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="result">结果</label>
            <select id="result" name="result" defaultValue={filters.result}>
              <option value="">全部结果</option>
              <option value="SUCCESS">成功</option>
              <option value="FAILED">失败</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="keyword">关键词</label>
            <input id="keyword" name="keyword" defaultValue={filters.keyword} placeholder="动作、对象或操作者" />
          </div>
          <div className="field">
            <label htmlFor="startDate">开始日期</label>
            <input id="startDate" name="startDate" type="date" defaultValue={filters.startDate} />
          </div>
          <div className="field">
            <label htmlFor="endDate">结束日期</label>
            <input id="endDate" name="endDate" type="date" defaultValue={filters.endDate} />
          </div>
          <div className="top-actions">
            <button className="ui-button ui-button--secondary" type="submit">筛选日志</button>
          </div>
        </form>
        <table className="table">
          <thead>
            <tr><th>时间</th><th>操作者</th><th>角色</th><th>动作</th><th>对象</th><th>来源</th><th>附加信息</th><th>结果</th></tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt}</td>
                <td>{log.actorName}</td>
                <td>{log.actorRole}</td>
                <td>{log.action}</td>
                <td>{log.targetType}:{log.targetId}</td>
                <td>{log.ipAddress}</td>
                <td>{log.metadataSummary}</td>
                <td><StatusBadge tone={log.result === "SUCCESS" ? "success" : "danger"}>{log.result}</StatusBadge></td>
              </tr>
            ))}
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">暂无匹配审计日志</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <PaginationControls
          basePath="/admin/system"
          page={auditLogsPage.page}
          pageCount={auditLogsPage.pageCount}
          total={auditLogsPage.total}
          pageParam="auditPage"
          params={{
            actorRole: filters.actorRole,
            targetType: filters.targetType,
            result: filters.result,
            keyword: filters.keyword,
            startDate: filters.startDate,
            endDate: filters.endDate,
            auditPage: auditLogsPage.page
          }}
        />
      </Card>
    </>
  );
}
