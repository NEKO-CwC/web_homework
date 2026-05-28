"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface SearchItem {
  id: string;
  label: string;
  href: string;
  type: string;
  text: string;
}

export function GlobalSearch({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const keyword = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (keyword.length < 2) return [];
    return items
      .filter((item) => item.text.toLowerCase().includes(keyword))
      .slice(0, 5);
  }, [items, keyword]);
  const showResults = focused && keyword.length >= 2;

  return (
    <div
      className="search"
      role="search"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <Search size={18} />
      <input
        aria-controls="global-search-results"
        aria-label="搜索商品、店铺、订单号或运单号"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索商品、店铺、订单号或运单号"
      />
      <span className="search-result" aria-live="polite">
        {keyword.length < 2
          ? "待输入"
          : results.length > 0
            ? `${results.length} 个结果`
            : "无结果"}
      </span>
      {showResults ? (
        <div className="search-panel" id="global-search-results">
          {results.length > 0 ? (
            results.map((item) => (
              <Link className="search-option" href={item.href} key={`${item.type}-${item.id}`}>
                <span>{item.type}</span>
                <strong>{item.label}</strong>
              </Link>
            ))
          ) : (
            <div className="search-empty">无匹配结果</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
