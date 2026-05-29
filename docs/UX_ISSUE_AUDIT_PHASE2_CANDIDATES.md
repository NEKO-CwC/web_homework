---
document_type: ux_audit
status: active
created_at: 2026-05-29
updated_at: 2026-05-29
source_of_truth:
  - docs/SHOPPING_UI_REDESIGN_SOT.md
scope:
  - customer_storefront
  - account
  - cart_checkout_orders_after_sale
  - merchant_workbench
  - admin_workbench
---

# Minimal Mall UX 问题巡检清单

## 1. 文档定位

本文档记录 Phase 1 商城化导航改造之后仍存在的 UX 瑕疵，用于后续 Phase 2 / Phase 3 批量修复规划。本文档只做问题发现和建议，不代表已实施修复。

巡检依据：

- `docs/SHOPPING_UI_REDESIGN_SOT.md`
- 当前代码中的页面、组件和表单实现
- 用户反馈：登录 / 注册 tabs 没有切换作用，个人信息应该登录后显示

## 2. 总体判断

Phase 1 已经解决“三种角色入口同时暴露”的大问题，但许多页面内部仍保留课程演示式交互。主要问题不是功能缺失，而是控件语义和用户预期不匹配：

- 一些 tabs 看起来可切换，实际只是静态装饰。
- 多个表单默认填入演示数据，用户容易误提交。
- 未登录、错误角色、空数据、不可操作状态的引导还不够自然。
- 页面标题和说明仍在解释“功能覆盖 / 校验 / 同步 / 虚拟流程”，不像真实商城文案。
- 商家和管理员工作台把多个任务混在一页，认知负担较高。
- 部分状态直接展示内部枚举值，不符合用户语言。

## 3. 高优先级问题

### UX-001 账号页登录 / 注册 tabs 不可切换

优先级：P0

证据：

- `apps/storefront/app/account/page.tsx:22-24` 渲染“登录 / 注册会员”两个 tab。
- `apps/storefront/app/account/page.tsx:34-45` 登录表单始终显示。
- `apps/storefront/app/account/page.tsx:47-68` 注册表单也始终显示。

问题：

用户会认为点击 tab 可以在登录和注册之间切换，但当前两个表单同时展示，tab 只是视觉装饰。这个问题和用户反馈完全一致。

建议：

- 将账号页改成真正的登录 / 注册分段控件。
- 未登录时默认只显示登录表单，用户点“注册会员”后再显示注册表单。
- 登录成功后隐藏登录/注册表单，显示账号摘要和退出登录。

### UX-002 个人信息未登录时也显示

优先级：P0

证据：

- `apps/storefront/app/account/page.tsx:86-102` 个人信息卡片无条件渲染。
- `apps/storefront/app/account/page.tsx:10` 对 `getCurrentCustomerProfile(sessionUser?.id)` 的调用在未登录时传入 `undefined`。
- `apps/storefront/lib/data/customer.ts:22` `getCurrentCustomerProfile(userId = CURRENT_CUSTOMER_ID)` 会回退到默认顾客。

问题：

游客打开账号页时也会看到个人信息表单，而且可能带出默认顾客资料。这与“个人信息应该登录之后显示”冲突，也容易让用户误以为自己已经登录。

建议：

- 只有 `sessionUser?.role === "CUSTOMER"` 时显示个人信息。
- 未登录时个人信息区域应显示登录引导或不显示。
- 商家 / 管理员访问账号页时显示账号摘要，不展示顾客资料表单。

### UX-003 账号页仍有课程验收式说明和角色教学

优先级：P1

证据：

- `apps/storefront/app/account/page.tsx:16-17` 标题为“注册登录 / 个人信息”，说明“覆盖账号登录、会员注册入口、资料维护、默认地址带入结算页”。
- `apps/storefront/app/account/page.tsx:70-74` 展示“游客 / 顾客 / 角色隔离”的步骤说明。

问题：

账号页仍像验收说明页，不像购物网站的登录注册页。

建议：

- 标题改为“登录 / 注册”或“我的账号”。
- 删除角色教学步骤。
- 未登录展示登录价值说明；已登录展示账号资料、默认地址、退出登录。

### UX-004 多个前台表单默认填入演示数据

优先级：P1

证据：

- `apps/storefront/app/account/page.tsx:43` 登录密码默认 `12345678`。
- `apps/storefront/app/account/page.tsx:50-66` 注册表单默认填入邮箱、密码、昵称、电话、地址。
- `apps/storefront/app/after-sale/page.tsx:69` 评价内容默认填入“配送很快，商品质感符合预期。”
- `apps/storefront/app/after-sale/page.tsx:100-104` 售后原因和说明默认填入示例内容。
- `apps/storefront/app/merchant/apply/page.tsx:37-55` 开店申请默认填入店铺名、介绍和资质图片。

问题：

默认值适合作业演示，但真实商城会让用户误提交样例内容。尤其评价、售后、开店申请属于用户真实意图表达，不应默认填好。

建议：

- 将默认值改为 placeholder。
- 对测试需要的默认数据，用 E2E helper 填入，而不是页面默认填入。
- 保留必要的 demo 账号提示时，应放在开发/演示模式或折叠提示里。

### UX-005 商品详情页仍是验收说明文案

优先级：P1

证据：

- `apps/storefront/app/products/[id]/page.tsx:35-36` 标题为“商品详情”，说明“展示主图区域、商品信息卡、价格、库存、参数、评分、加入购物车和立即购买。”

问题：

商品详情页应该突出商品名、价格、购买决策信息，而不是解释页面组件结构。

建议：

- 页面标题直接使用商品名。
- 副文案改为商品卖点或店铺服务说明。
- 将“商品参数 / 评价列表”保留为内容区，不在页头解释页面结构。

### UX-006 游客点击加入购物车后才知道需要登录

优先级：P1

证据：

- `apps/storefront/app/components/AddCartForm.tsx:31-36` 商品卡和详情页直接显示“加入购物车”按钮。
- `apps/storefront/lib/actions.ts` 中加入购物车最终依赖 `requireActorId("customer")`，游客提交后才返回错误。

问题：

游客前台可浏览商品，但需要登录的购买动作应该提前给出明确预期。当前按钮看起来可购买，失败后才知道要登录。

建议：

- 导航或页面层把登录状态传给 `AddCartForm`。
- 游客看到“登录后加入购物车”或点击后跳转登录，并带回当前商品路径。
- 已登录顾客显示正常“加入购物车”。

## 4. 中优先级问题

### UX-007 售后页 tabs 同样是静态装饰

优先级：P1

证据：

- `apps/storefront/app/after-sale/page.tsx:44-46` “提交评价 / 重复评价禁用”两个 tab 不切换内容。
- `apps/storefront/app/after-sale/page.tsx:75-77` “发起售后 / 凭证可选”两个 tab 不切换内容。

问题：

这和账号页是同类反模式：用户以为可以切换视图，实际只是标签。

建议：

- 如果需要切换，改成真实 tabs：评价、售后、售后记录。
- 如果只是状态说明，改为 badge 或 helper text，不使用 tab 样式。

### UX-008 售后页暴露内部状态和后台语境

优先级：P1

证据：

- `apps/storefront/app/after-sale/page.tsx:39` 文案提到“售后申请进入商家中台待处理列表”。
- `apps/storefront/app/after-sale/page.tsx:120` 文案提到 `REQUESTED` 和“商家中台”。

问题：

顾客不需要知道后台中台或内部状态枚举。前台应该说“提交后商家会处理”。

建议：

- 顾客侧统一使用“待商家处理 / 已通过 / 已驳回 / 已关闭”等中文状态。
- 删除“商家中台”“REQUESTED”等内部表达。

### UX-009 结算页仍有课程演示选项

优先级：P1

证据：

- `apps/storefront/app/checkout/page.tsx:74-75` 支付方式包含“课程演示卡”“模拟支付失败”。
- `apps/storefront/app/checkout/page.tsx:100` 显示“演示立减”。

问题：

这是验收语境，不是商城语境。虽然虚拟支付是项目范围，但不应直接写“课程演示 / 模拟”。

建议：

- “课程演示卡”改为“银行卡支付”或“校园卡支付”。
- “模拟支付失败”只在测试/管理员调试模式出现，普通用户不显示。
- “演示立减”改为“满减优惠”。

### UX-010 购物车空状态重复显示

优先级：P2

证据：

- `apps/storefront/app/cart/page.tsx:27` 页面层渲染空购物车 `EmptyState`。
- `apps/storefront/app/components/CartPanel.tsx:139` 组件内部也渲染“购物车为空”。

问题：

空购物车可能出现重复提示。即使当前组件仍显示结算摘要，空状态层级也会混乱。

建议：

- 由 `CartPanel` 统一处理空购物车。
- 空购物车时隐藏结算摘要或改为“去首页逛逛”的主操作。

### UX-011 购物车禁用结算使用伪禁用链接

优先级：P2

证据：

- `apps/storefront/app/components/CartPanel.tsx:146-152` 结算入口是 `<a>`，通过 `aria-disabled`、`pointerEvents` 和 opacity 模拟禁用。

问题：

链接语义上仍是链接，键盘和辅助技术体验可能不稳定，也容易造成测试和可访问性问题。

建议：

- 空购物车时不渲染结算链接，改为禁用 button 或“去首页选购”链接。
- 有商品时渲染真实 `/checkout` 链接。

### UX-012 订单页缺少状态分组和空状态

优先级：P2

证据：

- `apps/storefront/app/orders/page.tsx:33-74` 订单直接以单表格展示。
- `apps/storefront/app/orders/page.tsx:68` 非可操作订单显示“暂无操作”。
- 未发现订单为空时的专门空状态。

问题：

常见购物网站会按“待付款 / 待发货 / 待收货 / 待评价 / 售后”组织订单。当前单表格更像后台数据表。

建议：

- 增加订单状态筛选 tabs 或 chips。
- 对“暂无操作”改成更具体的状态说明，例如“等待商家发货”“已完成”。
- 没有订单时展示“暂无订单，去首页看看”。

### UX-013 全局搜索在前台仍提示订单号和运单号

优先级：P2

证据：

- `apps/storefront/app/components/GlobalSearch.tsx:41-44` aria-label 和 placeholder 都是“搜索商品、店铺、订单号或运单号”。

问题：

Phase 1 已经按 shell 过滤搜索结果，但前台游客搜索框仍暗示可以搜订单/运单，和购物发现场景不一致。

建议：

- `GlobalSearch` 接收 `placeholder` / `ariaLabel`。
- 前台用“搜索商品或店铺”。
- 顾客订单页或后台 shell 再使用“搜索订单号、运单号”等工作台语境。

## 5. 商家中心问题

### UX-014 商家商品页把四个任务混在一个长页

优先级：P1

证据：

- `apps/storefront/app/merchant/products/page.tsx:63-103` 发布商品表单。
- `apps/storefront/app/merchant/products/page.tsx:108-128` 店铺资料表单。
- `apps/storefront/app/merchant/products/page.tsx:136-179` 商品列表和上下架。
- `apps/storefront/app/merchant/products/page.tsx:184-242` 多个商品编辑表单。

问题：

商家进入“商品管理 / 店铺资料”后同时看到发布、店铺资料、列表、编辑表单，认知负担很高，也容易误操作。

建议：

- Phase 2/3 拆成“商品列表 + 新增商品抽屉/页面 + 编辑商品页面 + 店铺资料页面”。
- Phase 2 可先做轻量 tabs：商品列表、发布商品、店铺资料。

### UX-015 发布商品表单默认填入已有商品信息

优先级：P1

证据：

- `apps/storefront/app/merchant/products/page.tsx:73-100` 发布商品表单默认填入“空气感智能台灯”、价格、库存、类目、图片和介绍。

问题：

商家可能误以为这是正在编辑已有商品，也可能直接提交重复商品。

建议：

- 新增商品表单默认为空，仅使用 placeholder 示例。
- 从“编辑商品”入口进入时才填入已有商品信息。

### UX-016 商家售后处理默认回复过度具体

优先级：P2

证据：

- `apps/storefront/app/merchant/orders/page.tsx:177` 售后处理说明默认填入“同意换货，请顾客保持包装完整并等待虚拟退回单。”

问题：

处理说明代表商家的真实回复，不应默认替商家做决定。

建议：

- 默认值改 placeholder。
- 根据处理结果切换 placeholder：通过时提示“请说明处理方式”，驳回时提示“请说明驳回原因”。

## 6. 管理员后台问题

### UX-017 商家审核页混合申请和已入驻店铺

优先级：P1

证据：

- `apps/storefront/app/admin/merchants/page.tsx:72-109` 渲染商家申请行。
- `apps/storefront/app/admin/merchants/page.tsx:111-133` 在同一表格继续渲染已入驻店铺行。
- `apps/storefront/app/admin/merchants/page.tsx:145-160` 同一页面放两套分页控件。

问题：

申请审核和店铺运营管理是两个任务，混在同一张表里会让列含义不一致，例如“提交时间”对店铺显示“已入驻”。

建议：

- 分成“入驻申请”和“已入驻店铺”两个 tab 或两个独立 panel。
- 两张表分别拥有清晰列名和分页。

### UX-018 管理员页面直接展示内部枚举值

优先级：P2

证据：

- `apps/storefront/app/admin/merchants/page.tsx:82-84` 商家申请状态显示 `SUBMITTED / APPROVED / REJECTED`。
- `apps/storefront/app/admin/merchants/page.tsx:115` 店铺状态显示 `ACTIVE / FROZEN`。
- `apps/storefront/app/admin/home/page.tsx:88` Banner 状态显示 `ONLINE / OFFLINE`。
- `apps/storefront/app/admin/system/page.tsx:166-171` 审计日志展示 `actorRole / targetType / result` 原始值。

问题：

工作台可以保留技术细节，但主要状态仍应是用户语言。原始枚举会降低可读性。

建议：

- 增加统一的状态格式化函数。
- 表格显示中文状态，必要时在 tooltip 或详情中保留原始枚举。

### UX-019 管理员首页管理混入英文 Preview

优先级：P3

证据：

- `apps/storefront/app/admin/home/page.tsx:32` `data-label="Banner Preview"`。
- `apps/storefront/app/admin/home/page.tsx:40` 状态徽标显示 `Preview`。

问题：

界面语言不统一，影响整体质感。

建议：

- 改为“预览”或“首页预览”。

### UX-020 系统维护页暴露过多内部日志字段

优先级：P2

证据：

- `apps/storefront/app/admin/system/page.tsx:157-172` 审计日志直接展示角色、动作、对象、来源、附加信息、结果。
- `apps/storefront/app/admin/system/page.tsx:168-170` 直接拼接 `targetType:targetId`、`ipAddress`、`metadataSummary`。

问题：

系统维护页功能完整，但阅读体验偏数据库日志表。管理员更关心“谁在什么时候做了什么，结果如何”。

建议：

- 默认表格显示：时间、操作者、操作摘要、结果。
- 详细元数据放到展开行或详情弹窗。

## 7. 跨页面文案问题

### UX-021 多个前台页面仍在解释实现能力

优先级：P2

证据：

- `apps/storefront/app/cart/page.tsx:24` “支持数量修改、库存边界、删除入口、行小计和结算摘要。”
- `apps/storefront/app/checkout/page.tsx:45` “确认地址、支付方式和履约步骤，提交后生成订单与虚拟支付流水。”
- `apps/storefront/app/orders/page.tsx:24` “展示订单号、商品、状态、运单号、金额、物流时间线和确认收货入口。”

问题：

这些文案是验收说明，不是用户任务语言。

建议：

- 购物车：改为“确认想购买的商品和数量，准备好后去结算。”
- 结算：改为“确认收货信息和支付方式。”
- 订单：改为“查看订单进度、物流和售后入口。”

### UX-022 状态和动作反馈有时不够贴近用户任务

优先级：P2

证据：

- `apps/storefront/app/orders/page.tsx:68` 非可操作订单统一显示“暂无操作”。
- `apps/storefront/app/merchant/orders/page.tsx:181` 非待处理售后显示禁用按钮“已处理”。

问题：

“暂无操作 / 已处理”是系统视角，不告诉用户接下来会发生什么或为什么不能操作。

建议：

- 根据状态显示具体说明，如“等待商家发货”“等待顾客确认收货”“售后已通过，无需重复处理”。

## 8. 建议修复顺序

第一批，直接影响用户反馈和账号体验：

1. UX-001 账号页 tabs 真正切换。
2. UX-002 个人信息登录后显示。
3. UX-003 清理账号页角色教学和验收文案。
4. UX-004 移除前台表单默认演示值。

第二批，购物链路体验：

1. UX-005 商品详情页改为商品导向。
2. UX-006 游客购买动作提前登录引导。
3. UX-007 / UX-008 售后页 tabs 和内部状态清理。
4. UX-009 / UX-012 / UX-013 结算、订单、搜索语境优化。

第三批，中后台信息架构：

1. UX-014 / UX-015 商家商品页拆分或分段。
2. UX-017 管理员商家审核页拆分申请和店铺。
3. UX-018 / UX-020 后台枚举和审计日志展示优化。

## 9. 验证建议

后续修复完成后，至少补充以下 E2E 断言：

- 未登录账号页只显示登录/注册，不显示个人信息表单。
- 登录 / 注册 tabs 点击后只显示对应表单。
- 登录顾客账号页显示个人信息和退出登录。
- 游客点击商品加入购物车出现登录引导，登录后可继续加入。
- 售后页不出现静态假 tabs，不出现 `REQUESTED` 或“商家中台”文案。
- 管理员商家页中申请和店铺不混在同一表格。

