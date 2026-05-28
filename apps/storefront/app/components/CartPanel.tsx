"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, Card, StatusBadge } from "@minimal-mall/ui";
import { removeCartItemAction, updateCartQuantityAction, type ActionState } from "@/lib/actions";
import { formatMoney } from "@/lib/format";

interface CartPanelLine {
  id: string;
  quantity: number;
  product: {
    name: string;
    stock: number;
    priceCents: number;
  };
  storeName?: string;
}

const initialState: ActionState = {
  ok: false,
  message: ""
};

export function CartPanel({ initialLines }: { initialLines: CartPanelLine[] }) {
  const [lines, setLines] = useState(initialLines);
  const [feedback, setFeedback] = useState<ActionState>(initialState);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0),
    [lines]
  );
  const discount = subtotal > 30000 ? 4000 : 0;
  const total = Math.max(0, subtotal - discount);

  function submitQuantity(line: CartPanelLine, quantity: number) {
    const nextQuantity = Math.max(1, Math.min(line.product.stock, quantity));
    if (nextQuantity === line.quantity) return;
    const previousLines = lines;
    setLines((current) => current.map((item) => (
      item.id === line.id ? { ...item, quantity: nextQuantity } : item
    )));
    setPendingLineId(line.id);
    setFeedback(initialState);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("cartItemId", line.id);
      formData.set("quantity", String(nextQuantity));
      const result = await updateCartQuantityAction(initialState, formData);
      setFeedback(result);
      setPendingLineId(null);
      if (!result.ok) setLines(previousLines);
    });
  }

  function removeLine(line: CartPanelLine) {
    const previousLines = lines;
    setLines((current) => current.filter((item) => item.id !== line.id));
    setPendingLineId(line.id);
    setFeedback(initialState);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("cartItemId", line.id);
      const result = await removeCartItemAction(initialState, formData);
      setFeedback(result);
      setPendingLineId(null);
      if (!result.ok) setLines(previousLines);
    });
  }

  return (
    <div className="grid aside">
      <Card className="panel">
        <h3>购物车商品</h3>
        {feedback.message ? (
          <div
            className={`form-feedback ${feedback.ok ? "success" : "danger"}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </div>
        ) : null}
        {lines.map((line) => {
          const isLinePending = isPending && pendingLineId === line.id;
          return (
            <div className="row" key={line.id}>
              <div className="row-main">
                <div className="thumb" />
                <div>
                  <h4>{line.product.name}</h4>
                  <p>{line.storeName} · 库存 {line.product.stock}</p>
                  <StatusBadge tone={line.product.stock > 0 ? "success" : "danger"}>
                    {line.product.stock > 0 ? "可结算" : "缺货"}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <div className="top-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`减少 ${line.product.name} 数量`}
                    disabled={line.quantity <= 1 || isLinePending}
                    onClick={() => submitQuantity(line, line.quantity - 1)}
                  >
                    <Minus size={14} />
                  </Button>
                  <strong aria-live="polite">{line.quantity}</strong>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`增加 ${line.product.name} 数量`}
                    disabled={line.quantity >= line.product.stock || isLinePending}
                    onClick={() => submitQuantity(line, line.quantity + 1)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                  小计 {formatMoney(line.quantity * line.product.priceCents)}
                  {line.quantity >= line.product.stock ? " · 已达库存上限" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                type="button"
                aria-label={`删除 ${line.product.name}`}
                disabled={isLinePending}
                onClick={() => removeLine(line)}
              >
                <Trash2 size={16} /> 删除
              </Button>
            </div>
          );
        })}
        {lines.length === 0 ? <div className="empty-state">购物车为空，先去首页挑选商品。</div> : null}
      </Card>
      <aside className="card panel">
        <h3>结算摘要</h3>
        <div className="row"><span>商品金额</span><strong>{formatMoney(subtotal)}</strong></div>
        <div className="row"><span>虚拟优惠</span><strong>- {formatMoney(discount)}</strong></div>
        <div className="row"><span>应付合计</span><strong>{formatMoney(total)}</strong></div>
        <a
          className="ui-button ui-button--primary"
          href="/checkout"
          aria-disabled={lines.length === 0}
          style={{ width: "100%", marginTop: 16, pointerEvents: lines.length === 0 ? "none" : undefined, opacity: lines.length === 0 ? .52 : undefined }}
        >
          去结算
        </a>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
          数量变更会同步行小计和应付合计，低于 1 或达到库存上限时操作自动禁用。
        </p>
      </aside>
    </div>
  );
}
