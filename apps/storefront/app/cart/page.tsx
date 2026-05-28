import { CartPanel } from "../components/CartPanel";
import { AccessDenied } from "../components/AccessDenied";
import { EmptyState } from "../components/PageState";
import { listCartItems, listStores } from "@/lib/data";
import { requireSessionUser } from "@/lib/session";

export default async function CartPage() {
  const { user, denied } = await requireSessionUser("customer");
  if (denied || !user) return <AccessDenied {...(denied ?? { title: "请先登录", message: "请登录后访问购物车。" })} />;
  const [cartItems, stores] = await Promise.all([
    listCartItems(user.id),
    listStores()
  ]);
  const lines = cartItems.map((line) => ({
    ...line,
    store: stores.find((store) => store.id === line.product.storeId)
  }));

  return (
    <>
      <div className="page-title">
        <div>
          <h2>购物车</h2>
          <p>支持数量修改、库存边界、删除入口、行小计和结算摘要。</p>
        </div>
      </div>
      {lines.length === 0 ? <EmptyState label="购物车为空，先去首页挑选商品。" /> : null}
      <CartPanel
        initialLines={lines.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          storeName: line.store?.name,
          product: {
            name: line.product.name,
            stock: line.product.stock,
            priceCents: line.product.priceCents
          }
        }))}
      />
    </>
  );
}
