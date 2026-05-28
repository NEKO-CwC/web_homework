"use client";

import { ShoppingCart } from "lucide-react";
import { useActionState, useEffect } from "react";
import { Button } from "@minimal-mall/ui";
import { addCartAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {
  ok: false,
  message: ""
};

export function AddCartForm({
  productId,
  productName,
  stock,
  compact = false
}: {
  productId: string;
  productName: string;
  stock: number;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(addCartAction, initialState);

  useEffect(() => {
    if (!state.ok || !state.payload?.cartDelta) return;
    window.dispatchEvent(new CustomEvent("minimal-mall:cart-change", {
      detail: { delta: state.payload.cartDelta }
    }));
  }, [state]);

  return (
    <form action={action} className={compact ? "compact-cart-form" : "form"}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productName" value={productName} />
      <input type="hidden" name="stock" value={String(stock)} />
      <Button type="submit" disabled={pending || stock < 1}>
        <ShoppingCart size={16} />
        {stock < 1 ? "缺货" : compact ? "加入" : pending ? "加入中..." : "加入购物车"}
      </Button>
      {state.message ? (
        <div
          className={`${compact ? "cart-toast" : "form-feedback"} ${state.ok ? "success" : "danger"}`}
          role="status"
          aria-live="polite"
        >
          {compact && state.ok ? "已加入购物车" : state.message}
        </div>
      ) : null}
    </form>
  );
}
