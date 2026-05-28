import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, StatusBadge } from "@minimal-mall/ui";
import { AccessDenied } from "../components/AccessDenied";
import { getAdminOverview } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";

export default async function AdminDashboardPage() {
  const { denied } = await requireSessionUser("admin");
  if (denied) return <AccessDenied {...denied} />;
  const overview = await getAdminOverview();

  return (
    <>
      <div className="page-title">
        <div>
          <h2>管理员平台总览</h2>
          <p>统一监管商家、首页内容、系统运维状态和待办事项。</p>
        </div>
      </div>
      <div className="grid cols-4">
        <Card className="metric"><div className="num">{overview.storeCount}</div><div className="label">入驻商家</div></Card>
        <Card className="metric"><div className="num">{overview.pendingMerchantCount}</div><div className="label">待审核商家</div></Card>
        <Card className="metric"><div className="num">{overview.onlineBannerCount}</div><div className="label">首页广告位</div></Card>
        <Card className="metric"><div className="num">{overview.health}</div><div className="label">系统健康度</div></Card>
      </div>
      <section className="section-head">
        <div><h3>待办事项</h3><p>跳转到对应管理页面完成审核、首页配置和系统维护。</p></div>
      </section>
      <Card className="panel">
        <div className="row">
          <div>
            <h4>潮流配件仓申请入驻</h4>
            <p>服饰配件类目 · 资料完整</p>
          </div>
          <Link className="ui-button ui-button--primary" href="/admin/merchants">去审核 <ArrowRight size={16} /></Link>
        </div>
        <div className="row">
          <div>
            <h4>首页 Banner 已上线 {overview.onlineBannerCount} 个</h4>
            <p>可调整标题、图片、跳转链接和上线状态。</p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/admin/home">管理首页</Link>
        </div>
        <div className="row">
          <div>
            <h4>售后待处理 {overview.afterSaleCount} 个</h4>
            <p>商家处理会同步写入审计日志。</p>
          </div>
          <StatusBadge tone="warning">待跟进</StatusBadge>
        </div>
        <div className="row">
          <div>
            <h4>{overview.systemTodoTitle}</h4>
            <p>{overview.systemTodoDescription}</p>
          </div>
          <div className="top-actions">
            <StatusBadge tone={overview.systemTodoTone}>服务状态</StatusBadge>
            <Link className="ui-button ui-button--secondary" href="/admin/system">查看系统</Link>
          </div>
        </div>
      </Card>
    </>
  );
}
