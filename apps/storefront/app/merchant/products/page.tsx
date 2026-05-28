import { Card, StatusBadge } from "@minimal-mall/ui";
import { AccessDenied } from "@/app/components/AccessDenied";
import { ActionForm } from "@/app/components/ActionForm";
import { ImageUploadField } from "@/app/components/ImageUploadField";
import { PaginationControls } from "@/app/components/PaginationControls";
import { productPublishAction, productStatusAction, productUpdateAction, saveStoreProfileAction } from "@/lib/actions";
import { getActiveMerchantStore, listCategories, listMerchantProductsPage } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";
import { formatMoney } from "@/lib/format";
import { formatProductList } from "./view-model";

export default async function MerchantProductsPage({
  searchParams
}: {
  searchParams?: Promise<{
    productStatus?: string;
    productPage?: string;
    status?: string;
  }>;
}) {
  const { user, denied } = await requireSessionUser("merchant");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "403 无权访问", message: "当前账号无权访问商家中台。" })} />;
  const params = await searchParams;
  const productStatus = params?.productStatus === "ACTIVE" || params?.productStatus === "OFF_SHELF" || params?.productStatus === "SOLD_OUT" || params?.productStatus === "DRAFT"
    ? params.productStatus
    : "";
  const store = await getActiveMerchantStore(user.id);
  if (!store) {
    return (
      <AccessDenied
        title="暂无店铺"
        message="当前账号还没有可管理店铺，请先提交开店申请并等待管理员审核通过。"
      />
    );
  }
  const [categories, productsPage] = await Promise.all([
    listCategories(),
    listMerchantProductsPage(store.id, {
      status: productStatus,
      page: params?.productPage,
      pageSize: 2
    })
  ]);
  const products = productsPage.items;
  const merchantProducts = formatProductList(products);
  const justApproved = params?.status === "merchant-approved";

  return (
    <>
      <div className="page-title">
        <div>
          <h2>商家商品 / 店铺管理</h2>
          <p>维护店铺资料，创建、编辑、上架、下架自己的商品，并校验价格、库存、图片。</p>
        </div>
      </div>
      {justApproved ? (
        <div className="form-feedback success" role="status" aria-live="polite" style={{ marginBottom: 18 }}>
          开店申请已自动通过，店铺已生成
        </div>
      ) : null}
      <div className="grid aside">
        <Card className="panel">
          <div className="top-actions" style={{ justifyContent: "space-between" }}>
            <h3>商品编辑</h3>
            <StatusBadge tone="success">{store.name}</StatusBadge>
          </div>
          <ActionForm action={productPublishAction} submitLabel="发布商品">
            <input type="hidden" name="storeId" value={store.id} />
            <div className="field">
              <label htmlFor="name">商品名称</label>
              <input id="name" name="name" defaultValue="空气感智能台灯" required minLength={2} data-required-message="商品名称至少 2 个字" data-min-length-message="商品名称至少 2 个字" />
            </div>
            <div className="field">
              <label htmlFor="price">价格（元）</label>
              <input id="price" name="price" type="number" min="0.01" step="0.01" defaultValue="329" required data-required-message="价格必须大于 0" data-min-message="价格必须大于 0" data-number-message="请输入有效价格" />
            </div>
            <div className="field">
              <label htmlFor="stock">库存</label>
              <input id="stock" name="stock" type="number" min="0" step="1" defaultValue="128" required data-required-message="库存必须是非负整数" data-min-message="库存不能小于 0" data-number-message="库存必须是整数" />
            </div>
            <div className="field">
              <label htmlFor="category">类目</label>
              <select id="category" name="categoryId" defaultValue="cat-digital" required data-required-message="请选择商品类目">
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <ImageUploadField
              id="imageUrl"
              name="imageUrl"
              label="商品图片"
              defaultValue="/products/lamp.jpg"
              scope="product"
            />
            <div className="field">
              <label htmlFor="description">商品介绍</label>
              <textarea id="description" name="description" defaultValue="低眩光面板、三档色温、隐藏式转轴，适合学习办公桌面。" required minLength={8} data-required-message="商品介绍至少 8 个字" data-min-length-message="商品介绍至少 8 个字" />
            </div>
          </ActionForm>
        </Card>

        <aside className="card panel">
          <h3>店铺资料</h3>
          <ActionForm action={saveStoreProfileAction} submitLabel="保存店铺资料" variant="secondary">
            <input type="hidden" name="storeId" value={store.id} />
            <div className="field">
              <label htmlFor="storeName">店铺名称</label>
              <input id="storeName" name="name" defaultValue={store.name} required minLength={2} data-required-message="店铺名称至少 2 个字" data-min-length-message="店铺名称至少 2 个字" />
            </div>
            <div className="field">
              <label htmlFor="storeCategory">经营类目</label>
              <select id="storeCategory" name="categoryId" defaultValue={store.categoryId} required data-required-message="请选择经营类目">
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="storeDescription">店铺介绍</label>
              <textarea id="storeDescription" name="description" defaultValue={store.description} required minLength={8} data-required-message="店铺介绍至少 8 个字" data-min-length-message="店铺介绍至少 8 个字" />
            </div>
          </ActionForm>
          <div className="form-feedback success">当前店铺正常经营，可发布新商品。</div>
        </aside>
      </div>

      <section className="section-head">
        <div>
          <h3>在售商品</h3>
          <p>状态、库存和前台展示来自商品 seed 数据；缺货商品保留占位但不可购买。</p>
        </div>
      </section>
      <Card className="panel table-wrap">
        <form className="form grid cols-4" method="get" style={{ marginBottom: 18 }}>
          <div className="field">
            <label htmlFor="productStatus">商品状态</label>
            <select id="productStatus" name="productStatus" defaultValue={productStatus}>
              <option value="">全部状态</option>
              <option value="ACTIVE">销售中</option>
              <option value="OFF_SHELF">已下架</option>
              <option value="SOLD_OUT">缺货</option>
              <option value="DRAFT">草稿</option>
            </select>
          </div>
          <div className="top-actions">
            <button className="ui-button ui-button--secondary" type="submit">筛选商品</button>
          </div>
        </form>
        <table className="table">
          <thead>
            <tr><th>商品</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {merchantProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.price}</td>
                <td>{product.stock}</td>
                <td><StatusBadge tone={product.tone}>{product.status}</StatusBadge></td>
                <td>
                  <div className="top-actions">
                    <ActionForm action={productStatusAction} submitLabel={product.status === "销售中" ? "下架" : "上架"} variant="ghost" className="inline-form">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="status" value={product.status === "销售中" ? "OFF_SHELF" : "ACTIVE"} />
                    </ActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls
          basePath="/merchant/products"
          page={productsPage.page}
          pageCount={productsPage.pageCount}
          total={productsPage.total}
          pageParam="productPage"
          params={{ productStatus, productPage: productsPage.page }}
        />
      </Card>

      <section className="section-head">
        <div>
          <h3>商品编辑</h3>
          <p>商家只能维护自己店铺的商品；保存后前台商品详情同步更新。</p>
        </div>
      </section>
      <div className="grid cols-2">
        {products.map((product) => (
          <Card className="panel" key={product.id}>
            <div className="top-actions" style={{ justifyContent: "space-between" }}>
              <h3>{product.name}</h3>
              <StatusBadge tone={product.status === "ACTIVE" ? "success" : product.status === "SOLD_OUT" ? "danger" : "warning"}>
                {product.status}
              </StatusBadge>
            </div>
            <ActionForm action={productUpdateAction} submitLabel="保存商品" variant="secondary">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="storeId" value={store.id} />
              <div className="field">
                <label htmlFor={`name-${product.id}`}>商品名称</label>
                <input id={`name-${product.id}`} name="name" defaultValue={product.name} required minLength={2} data-required-message="商品名称至少 2 个字" data-min-length-message="商品名称至少 2 个字" />
              </div>
              <div className="field">
                <label htmlFor={`price-${product.id}`}>价格（元）</label>
                <input id={`price-${product.id}`} name="price" type="number" min="0.01" step="0.01" defaultValue={String(product.priceCents / 100)} required data-required-message="价格必须大于 0" data-min-message="价格必须大于 0" data-number-message="请输入有效价格" />
              </div>
              <div className="field">
                <label htmlFor={`stock-${product.id}`}>库存</label>
                <input id={`stock-${product.id}`} name="stock" type="number" min="0" step="1" defaultValue={String(product.stock)} required data-required-message="库存必须是非负整数" data-min-message="库存不能小于 0" data-number-message="库存必须是整数" />
              </div>
              <div className="field">
                <label htmlFor={`category-${product.id}`}>类目</label>
                <select id={`category-${product.id}`} name="categoryId" defaultValue={product.categoryId} required data-required-message="请选择商品类目">
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <ImageUploadField
                id={`image-${product.id}`}
                name="imageUrl"
                label="商品图片"
                defaultValue={product.imageUrl}
                scope="product"
              />
              <div className="field">
                <label htmlFor={`description-${product.id}`}>商品介绍</label>
                <textarea id={`description-${product.id}`} name="description" defaultValue={product.description} required minLength={8} data-required-message="商品介绍至少 8 个字" data-min-length-message="商品介绍至少 8 个字" />
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>当前售价 {formatMoney(product.priceCents)}</p>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
