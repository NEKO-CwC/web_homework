# PRD Implementation Audit

Audit date: 2026-05-29

Scope: `docs/PRD.md` full-stack mall implementation. Docker Compose orchestration and CI remote deployment remain explicitly deferred by user instruction; this audit covers the application, Prisma/PostgreSQL integration, tests, screenshots, and local verification gates.

## Requirement Evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| REQ-001 Account registration, login, session, roles | Satisfied | `apps/storefront/app/account/page.tsx`, `apps/storefront/lib/session.ts`, `packages/auth/src/index.ts`; E2E: `protected pages require login or the right role`, `customer can see login feedback`, `customer can logout and protected pages require login again`, `visitor can register a member and use the new profile at checkout`; unit: password hashing and Prisma login/registration tests. |
| REQ-002 Customer profile | Satisfied | `apps/storefront/app/account/page.tsx`, `apps/storefront/app/checkout/page.tsx`; E2E: `customer profile updates flow into checkout defaults`, `visitor can register a member and use the new profile at checkout`; data tests verify Prisma profile lookup without seed leakage. |
| REQ-003 Product discovery and search | Satisfied | `apps/storefront/app/page.tsx`, `apps/storefront/lib/data/catalog.ts`, `packages/auth/src/index.ts`; E2E: product page renders, category filter, global search, add-to-cart feedback; unit: purchasable filtering and catalog search by product/store text. |
| REQ-004 Product detail | Satisfied | `apps/storefront/app/products/[id]/page.tsx`; E2E: product detail render, optimized media, detail add-to-cart, immediate buy; service tests cover unavailable/overstock product rejection. |
| REQ-005 Cart management | Satisfied | `apps/storefront/app/cart/page.tsx`, cart actions in `apps/storefront/lib/actions.ts`; E2E: `customer can add to cart and adjust cart quantities`; service tests cover ownership, quantity min/max, stock validation, and removal. |
| REQ-006 Checkout and virtual payment | Satisfied | `apps/storefront/app/checkout/page.tsx`, `PrismaMallWriteService.checkout` and `retryPayment`; E2E: checkout success, field validation, immediate buy, failed payment retry; service tests cover paid and pending orders plus stock behavior. |
| REQ-007 Customer orders and logistics | Satisfied | `apps/storefront/app/orders/page.tsx`, `listCustomerOrders`; E2E: customer order flow and merchant waybill updates; Prisma smoke verifies shipment timeline with at least 3 events. |
| REQ-008 Confirm receipt | Satisfied | `apps/storefront/app/orders/page.tsx`, `confirmReceive`; E2E: `customer can confirm receipt and submit a product review`; service tests enforce only owner and `SHIPPED` status. |
| REQ-009 Product review | Satisfied | `apps/storefront/app/after-sale/page.tsx`, product detail review display, `submitReview`; E2E: review submission and duplicate reviewed option; service tests bind review to order item/product and block duplicate/foreign reviews. |
| REQ-010 After-sale request | Satisfied | `apps/storefront/app/after-sale/page.tsx`, `createAfterSale`; E2E: evidence upload, stale business errors, customer after-sale syncing to merchant and status; Prisma smoke verifies real after-sale creation. |
| REQ-011 Merchant application | Satisfied | `apps/storefront/app/merchant/apply/page.tsx`, `submitMerchantApplication`; E2E: protected access and automatic approval setting flow; service tests cover pending duplicate prevention, manual queue visibility, approval role/store creation. |
| REQ-012 Store management | Satisfied | `apps/storefront/app/merchant/products/page.tsx`, `updateStoreProfile`, `updateStoreStatus`; E2E: merchant saves store data, admin freeze/restore; service tests enforce owner-only edits and frozen-store publish rejection. |
| REQ-013 Product publish and edit | Satisfied | `apps/storefront/app/merchant/products/page.tsx`, `publishProduct`, `updateProduct`, `updateProductStatus`; E2E: publish, edit, frontend sync, down-shelf behavior; service tests validate price, stock, ownership, and status rules. |
| REQ-014 Product image upload | Satisfied | `apps/storefront/app/components/ImageUploadField.tsx`, `apps/storefront/lib/upload.ts`; E2E: product upload rejects oversized file and unsupported GIF, upload failure feedback; unit: JPG/PNG, 2MB limit, storage failure, placeholder image fallback via `mapProduct`. |
| REQ-015 Merchant order handling | Satisfied | `apps/storefront/app/merchant/orders/page.tsx`, `listMerchantOrdersPage`; E2E: merchant order filtering/pagination and waybill creation; data tests verify Prisma merchant order scoping and customer display names. |
| REQ-016 Virtual waybill | Satisfied | `createShipment`, shipment schema/events; E2E: `merchant can create a virtual waybill`; service tests enforce `VL-0000-0000`, no duplicate store shipment, owner-only shipment, and state transition to `SHIPPED`. |
| REQ-017 Merchant after-sale handling | Satisfied | `apps/storefront/app/merchant/orders/page.tsx`, `handleAfterSale`; E2E: merchant approve/reject paths through customer sync tests; service tests audit approve/reject and customer order state sync; Prisma smoke verifies real merchant after-sale handling. |
| REQ-018 Merchant sales stats | Satisfied | `getMerchantStats`, `merchantSalesCents`, merchant orders page metrics; unit: stats only count current store pending after-sales and monthly revenue. |
| REQ-019 Admin overview | Satisfied | `apps/storefront/app/admin/page.tsx`, `getAdminOverview`; E2E and data tests cover merchant counts, banners, dynamic system health/todo links and service state summary. |
| REQ-020 Merchant review management | Satisfied | `apps/storefront/app/admin/merchants/page.tsx`, `reviewMerchantApplication`, `updateStoreStatus`; E2E: rejection requires reason, freeze/review store, filtering; service tests cover approval creating store and role, audit, and frozen products not purchasable. |
| REQ-021 Home and ad management | Satisfied | `apps/storefront/app/admin/home/page.tsx`, `saveHomeBanner`, `listHomeBanners`; E2E: banner image upload, title/subtitle/status save, customer homepage sync, clear feedback. |
| REQ-022 System maintenance config | Satisfied | `apps/storefront/app/admin/system/page.tsx`, `updateSystemSetting`, `listSystemServiceStatuses`; E2E: registration toggle, merchant review mode, cache refresh, payment/shipment/audit service metrics. |
| REQ-023 Audit logs | Satisfied | Prisma `AuditLog` model, `mapAuditLog`, `listAuditLogsPage`, admin system table; E2E: administrator filters login/order/banner audit logs by type/time; service tests cover admin login, merchant review, shipment, after-sale, store, home banner, and system setting audit writes. |
| REQ-024 Global search | Satisfied | `apps/storefront/app/layout.tsx`, `GlobalSearch`; E2E: visitor/customer order isolation, customer order and tracking number, merchant product/order/after-sale, admin merchant/banner/audit search. |

## Non-Functional Evidence

| Area | Status | Evidence |
| --- | --- | --- |
| UI page list and non-empty pages | Satisfied | `apps/storefront/e2e/smoke.spec.ts` renders all PRD core routes for visitor, customer, merchant, and admin. |
| UI interactions and feedback | Satisfied | Smoke E2E covers navigation, mobile menu, form validation, upload success/failure, Toast/Dialog-style feedback, pagination, empty states, and role-protected pages. |
| Screenshots | Satisfied | `pnpm ui:screenshots` generated 42 PNGs in `artifacts/ui-checks`: 14 core pages x 3 viewports (`390x844`, `768x1024`, `1440x900`). |
| Homepage performance | Satisfied | `pnpm performance` runs `apps/storefront/e2e/performance.spec.ts`, warming the homepage then asserting the first-screen product list loads within 1000ms. |
| Admin table pagination | Satisfied | Admin and merchant list pages use `PaginationControls` with page sizes <= 2 in current UI, below the PRD max of 20. |
| Optimized images | Satisfied | Storefront product/banner/detail pages use Next.js `Image`; E2E verifies seeded media renders. |
| Security and role checks | Satisfied | All customer/merchant/admin pages call `requireSessionUser`; actions call `requireActorId`; auth unit tests cover role access and scrypt password hashes. |
| Environment secrets | Satisfied | Secret scan after real DB validation found only placeholder connection strings in `README.md` and `.env.example`; real PostgreSQL URL is not committed. |
| PostgreSQL persistence and migrations | Satisfied | Hosted PostgreSQL `web_homework` schema verified with Prisma migrate status, `pnpm db:verify`, and `pnpm prisma:smoke`; smoke covers checkout, payment, shipment, receipt, after-sale handling, review, cleanup, and stock restore. |

## Deferred Items

The following PRD items are not counted complete in this application audit because the user explicitly allowed skipping them for now:

- Docker Compose orchestration and `docker compose up -d --build`.
- CI remote deployment over SSH and server-side Compose rebuild/restart.

## Verification Commands

Latest verified commands during this audit:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm performance
pnpm ui:screenshots
pnpm --filter @minimal-mall/storefront exec playwright test e2e/smoke.spec.ts --grep "global search"
pnpm --filter @minimal-mall/storefront exec playwright test e2e/smoke.spec.ts --grep "administrator can filter audit logs"
pnpm db:verify
pnpm prisma:smoke
pnpm db:verify
```

All commands above passed. The final `pnpm prisma:smoke` run used the real hosted PostgreSQL schema and returned `afterSaleStatus: "REJECTED"` and `status: "COMPLETED"` while preserving seed verification counts before and after cleanup.
