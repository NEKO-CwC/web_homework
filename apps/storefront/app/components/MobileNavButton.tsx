"use client";

import { Menu } from "lucide-react";
import { Button } from "@minimal-mall/ui";

export function MobileNavButton() {
  return (
    <Button
      className="menu-button"
      type="button"
      variant="secondary"
      aria-label="打开导航"
      onClick={() => document.querySelector(".sidebar")?.classList.toggle("open")}
    >
      <Menu size={18} />
    </Button>
  );
}
