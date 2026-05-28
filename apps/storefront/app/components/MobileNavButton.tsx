"use client";

import { Menu } from "lucide-react";
import { Button } from "@minimal-mall/ui";

export function MobileNavButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button
      className="menu-button"
      type="button"
      variant="secondary"
      aria-label="打开导航"
      aria-controls="primary-sidebar"
      aria-expanded={open}
      onClick={onToggle}
    >
      <Menu size={18} />
    </Button>
  );
}
