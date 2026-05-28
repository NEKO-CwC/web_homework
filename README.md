# Minimal Mall 在线商城

本仓库的产品与功能单一准则见 [docs/PRD.md](docs/PRD.md)。

当前范围：顾客前台、商家中台、管理员后台，技术栈为 Next.js、shadcn/ui、PostgreSQL、Prisma、Docker Compose 和 CI 远程部署。

## 当前实现范围

本轮先聚焦全栈项目落地，暂时跳过 Compose 编排和 CI 远程部署。已建立 pnpm monorepo、Next.js App Router 单应用、共享类型包、共享 UI primitives、Prisma schema 和 seed 脚本。

三端页面当前由 `apps/storefront` 承载：

- 顾客前台：`/`、`/products/[id]`、`/cart`、`/checkout`、`/orders`、`/after-sale`、`/account`
- 商家中台：`/merchant/apply`、`/merchant/products`、`/merchant/orders`
- 管理员后台：`/admin`、`/admin/merchants`、`/admin/home`、`/admin/system`

## 本地启动

```powershell
pnpm install
pnpm dev
```

默认访问 `http://localhost:3000`。

## 验证命令

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm e2e
pnpm ui:screenshots
pnpm performance
```

Coverage output is written to `coverage/storefront` and `coverage/auth`; thresholds enforce 80% line/function/statement coverage and 70% branch coverage for tested library modules.

`pnpm performance` 预热首页后验证首页首屏商品列表在本地开发环境下 1 秒内完成加载，对应 PRD 的首页性能门禁。

## 数据库准备

Prisma schema 位于 `packages/db/prisma/schema.prisma`，seed 位于 `packages/db/prisma/seed.ts`。配置 `.env` 后可执行：

```powershell
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed
pnpm db:verify
```

连接托管 PostgreSQL 时，建议在 `DATABASE_URL` 末尾显式指定业务 schema，例如：

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/default?schema=web_homework"
AUTH_SESSION_SECRET="replace-with-a-long-random-string"
MALL_WRITE_MODE="prisma"
```

远端或共享数据库使用 `migrate deploy` 应用已提交迁移，避免在托管库上执行开发迁移：

```powershell
pnpm prisma:generate
pnpm --filter @minimal-mall/db exec prisma migrate deploy --schema prisma/schema.prisma
pnpm db:seed
pnpm db:verify
pnpm prisma:smoke
```

默认 `MALL_WRITE_MODE=demo` 使用内置 seed/fixture 演示数据，便于无数据库运行页面。配置 PostgreSQL 并完成 migrate/seed 后，可将 `.env` 中的 `MALL_WRITE_MODE` 改为 `prisma`，Server Actions 会写入真实 Prisma 数据库，覆盖购物车、结算支付、确认收货、评价、售后、开店申请、商品发布、商家发货、商家审核、首页配置和系统配置。

`pnpm prisma:smoke` 会在当前 `DATABASE_URL` 指向的 schema 中创建临时顾客，执行真实 Prisma 写路径的下单、虚拟支付、商家发货、确认收货和评价，然后清理临时用户、订单、审计记录并恢复商品库存。

## 演示账号

- 管理员：`admin@example.com`
- 顾客：`customer@example.com`
- 商家：`merchant@example.com`
- 密码演示值：`12345678`
