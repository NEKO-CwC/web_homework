import Image from "next/image";
import { Card, StatusBadge } from "@minimal-mall/ui";
import { AccessDenied } from "@/app/components/AccessDenied";
import { ActionForm } from "@/app/components/ActionForm";
import { saveHomeAction } from "@/lib/actions";
import { listCategories, listHomeBannersForAdmin } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";

export default async function AdminHomePage() {
  const { denied } = await requireSessionUser("admin");
  if (denied) return <AccessDenied {...denied} />;
  const [banners, categories] = await Promise.all([
    listHomeBannersForAdmin(),
    listCategories()
  ]);
  const primary = banners[0];

  return (
    <>
      <div className="page-title">
        <div>
          <h2>首页 / 广告位管理</h2>
          <p>维护首页主 Banner、广告位、推荐分类和运营专题，保存后顾客首页展示更新。</p>
        </div>
      </div>
      <div className="grid aside">
        <Card className="panel">
          <h3>首页主 Banner</h3>
          {primary ? (
            <>
              <div className="banner-preview" data-label="Banner Preview">
                <Image
                  src={primary.imageUrl}
                  alt={`${primary.title} Banner 预览`}
                  fill
                  sizes="(max-width: 900px) 100vw, 60vw"
                  className="media-image banner-image"
                />
                <StatusBadge style={{ background: "rgba(255,255,255,.18)", color: "white" }}>Preview</StatusBadge>
                <h3 style={{ fontSize: 34, margin: "60px 0 6px" }}>{primary.title}</h3>
                <p style={{ margin: 0, color: "rgba(255,255,255,.72)" }}>{primary.subtitle}</p>
              </div>
              <div style={{ marginTop: 16 }}>
                <ActionForm action={saveHomeAction} submitLabel="保存首页配置">
                  <input type="hidden" name="bannerId" value={primary.id} />
                  <div className="field">
                    <label htmlFor="title">标题</label>
                    <input id="title" name="title" defaultValue={primary.title} />
                  </div>
                  <div className="field">
                    <label htmlFor="subtitle">副标题</label>
                    <input id="subtitle" name="subtitle" defaultValue={primary.subtitle} />
                  </div>
                  <div className="field">
                    <label htmlFor="imageUrl">图片</label>
                    <input id="imageUrl" name="imageUrl" defaultValue={primary.imageUrl} />
                  </div>
                  <div className="field">
                    <label htmlFor="linkUrl">跳转链接</label>
                    <input id="linkUrl" name="linkUrl" defaultValue={primary.linkUrl} />
                  </div>
                  <div className="field">
                    <label htmlFor="status">上线状态</label>
                    <select id="status" name="status" defaultValue={primary.status}>
                      <option value="ONLINE">上线</option>
                      <option value="OFFLINE">下线</option>
                    </select>
                  </div>
                </ActionForm>
              </div>
            </>
          ) : (
            <div className="empty-state">暂无 Banner，保存配置后会创建首页广告位。</div>
          )}
        </Card>
        <aside className="card panel">
          <h3>广告位状态</h3>
          {banners.map((banner) => (
            <div className="row" key={banner.id}>
              <div>
                <h4>{banner.title}</h4>
                <p>{banner.linkUrl}</p>
              </div>
              <StatusBadge tone={banner.status === "ONLINE" ? "success" : "muted"}>{banner.status}</StatusBadge>
            </div>
          ))}
          <section className="section-head" style={{ marginTop: 24 }}>
            <div><h3>推荐分类</h3></div>
          </section>
          {categories.map((category) => (
            <div className="row" key={category.id}>
              <span>{category.name}</span>
              <StatusBadge tone={category.enabled ? "success" : "muted"}>{category.enabled ? "启用" : "停用"}</StatusBadge>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
