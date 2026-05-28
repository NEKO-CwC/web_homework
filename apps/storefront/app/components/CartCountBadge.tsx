"use client";

import { useEffect, useState } from "react";

export function CartCountBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    function handleCartChange(event: Event) {
      const delta = Number((event as CustomEvent<{ delta?: string }>).detail?.delta ?? 0);
      if (Number.isFinite(delta) && delta !== 0) {
        setCount((current) => Math.max(0, current + delta));
      }
    }

    window.addEventListener("minimal-mall:cart-change", handleCartChange);
    return () => window.removeEventListener("minimal-mall:cart-change", handleCartChange);
  }, []);

  return count > 0 ? <span className="count">{count}</span> : null;
}
