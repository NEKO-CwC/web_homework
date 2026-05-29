---
name: UI Redesign Source of Truth
description: Durable authority boundary for the商城化 UI redesign.
metadata:
  type: decision
updated_at: 2026-05-29
source: docs/SHOPPING_UI_REDESIGN_SOT.md
last_verified_scope: "UI, navigation, role shell, and shopping interaction redesign direction"
---

# UI Redesign Source of Truth

As of 2026-05-29, `docs/SHOPPING_UI_REDESIGN_SOT.md` is the authority for storefront UI, navigation visibility, role-specific shells, and shopping interaction model decisions.

`docs/PRD.md` remains authoritative for business scope, data capabilities, permission rules, and course requirement coverage. When UI composition or role entry visibility conflicts with older PRD wording, follow the UI redesign source-of-truth document.

The approved direction is a three-phase redesign: Phase 1 low-risk商城化 navigation/homepage cleanup, Phase 2 customer shopping flow refinement, and Phase 3 full role shell and visual verification completion.

Phase 1 was implemented on 2026-05-29 in the storefront app: `AppNavigation` now switches between storefront, merchant, and admin shells by route; the homepage removed course/seed/status-coverage language; access-denied pages show actionable login/switch-account/apply/return links. Verification passed with storefront lint, typecheck, Vitest, focused Playwright navigation/permission/search checks, and Next build.

The first high-priority UX cleanup batch from `docs/UX_ISSUE_AUDIT_PHASE2_CANDIDATES.md` was implemented on 2026-05-29: account login/register tabs are real client-side tabs, customer profile appears only for logged-in customer accounts, account/after-sale/merchant-apply demo defaults were removed, and after-sale customer pages no longer show fake tabs or internal `REQUESTED`/后台 wording. Verification passed with storefront lint, typecheck, Vitest, and focused Playwright account/register/after-sale/merchant-apply checks on desktop and mobile projects.
