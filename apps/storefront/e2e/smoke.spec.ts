import { expect, test, type Page } from "@playwright/test";

function pngUploadBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l83xNwAAAABJRU5ErkJggg==",
    "base64"
  );
}

const coreRoutes = [
  ["/", "精选商品"],
  ["/products/prod-lamp", "商品详情"],
  ["/account", "注册登录 / 个人信息"],
] as const;

const customerRoutes = [
  ["/cart", "购物车"],
  ["/checkout", "结算 / 虚拟支付"],
  ["/orders", "订单 / 虚拟物流"],
  ["/after-sale", "评价 / 退换货"],
  ["/merchant/apply", "商家开店申请"]
] as const;

const merchantRoutes = [
  ["/merchant/products", "商家商品 / 店铺管理"],
  ["/merchant/orders", "商家销售 / 物流 / 售后"]
] as const;

const adminRoutes = [
  ["/admin", "管理员平台总览"],
  ["/admin/merchants", "商家审核管理"],
  ["/admin/home", "首页 / 广告位管理"],
  ["/admin/system", "系统维护"]
] as const;

const screenshotPages = [
  { name: "home", route: "/" },
  { name: "product-detail", route: "/products/prod-lamp" },
  { name: "cart", route: "/cart", account: "customer@example.com" },
  { name: "checkout", route: "/checkout", account: "customer@example.com" },
  { name: "orders", route: "/orders", account: "customer@example.com" },
  { name: "after-sale", route: "/after-sale", account: "customer@example.com" },
  { name: "account", route: "/account" },
  { name: "merchant-apply", route: "/merchant/apply", account: "customer@example.com" },
  { name: "merchant-products", route: "/merchant/products", account: "merchant@example.com" },
  { name: "merchant-orders", route: "/merchant/orders", account: "merchant@example.com" },
  { name: "admin", route: "/admin", account: "admin@example.com" },
  { name: "admin-merchants", route: "/admin/merchants", account: "admin@example.com" },
  { name: "admin-home", route: "/admin/home", account: "admin@example.com" },
  { name: "admin-system", route: "/admin/system", account: "admin@example.com" }
] as const;

const screenshotViewports = [
  { name: "desktop", size: { width: 1440, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } }
] as const;

const screenshotShots = [
  ...screenshotViewports.flatMap((viewport) =>
    screenshotPages.map((page) => ({
      ...page,
      name: `${viewport.name}-${page.name}`,
      size: viewport.size
    }))
  ),
  { name: "tablet-orders", size: { width: 768, height: 1024 }, route: "/orders", account: "customer@example.com" }
] as const;

async function login(page: Page, account: string) {
  await page.goto("/account");
  await page.getByLabel("手机号 / 邮箱").first().fill(account);
  await page.getByLabel("密码").first().fill("12345678");
  await page.getByRole("button", { name: "进入商城" }).click();
  await expect(page.getByText("登录成功")).toBeVisible();
}

async function saveSystemSetting(page: Page, description: string, value: string) {
  const row = page.locator(".row").filter({ hasText: description });
  const form = row.locator("form");
  await form.getByLabel("配置值").selectOption(value);
  await form.getByRole("button", { name: "保存配置" }).click();
  await expect(form.getByText("系统配置已更新")).toBeVisible();
}

async function expectLoadedImage(page: Page, alt: string) {
  const image = page.getByRole("img", { name: alt });
  await expect(image).toBeAttached();
  await expect(image).toHaveJSProperty("complete", true);
  await expect(image).not.toHaveJSProperty("naturalWidth", 0);
}

async function expectLoadedImageBySource(page: Page, source: string) {
  const image = page.locator(`img[src*="${source}"]`).first();
  await expect(image).toBeAttached();
  await expect(image).toHaveJSProperty("complete", true);
  await expect(image).not.toHaveJSProperty("naturalWidth", 0);
}

async function prepareCleanScreenshot(page: Page) {
  await page.request.get("/__nextjs_disable_dev_indicator").catch(() => undefined);
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-dev-tools-button],
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      [aria-label="Open Next.js Dev Tools"],
      [aria-label="Next.js Dev Tools"],
      [aria-label="Issues"],
      [aria-label="Next.js Dev Overlay"],
      [data-testid="nextjs-dev-tools-indicator"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `
  });
}

async function findPaginatedOrderRow(page: Page, orderNo: string) {
  for (let pageNo = 1; pageNo <= 5; pageNo += 1) {
    const row = page.getByRole("row").filter({ hasText: orderNo });
    if (await row.count()) return row;
    const nextPage = page.getByRole("link", { name: "下一页" }).first();
    if (await nextPage.count() === 0) break;
    await nextPage.click();
  }
  return page.getByRole("row").filter({ hasText: orderNo });
}

async function reactivateMerchantProduct(page: Page, productName: string) {
  await login(page, "merchant@example.com");
  for (let pageNo = 1; pageNo <= 5; pageNo += 1) {
    await page.goto(`/merchant/products?productStatus=OFF_SHELF&productPage=${pageNo}`);
    const row = page.getByRole("row").filter({ hasText: productName });
    if (await row.count() === 0) continue;
    await row.getByRole("button", { name: "上架" }).click();
    await expect(row).toHaveCount(0);
    return;
  }
  throw new Error(`未找到待上架商品：${productName}`);
}

test.describe("core route smoke", () => {
  for (const [route, text] of coreRoutes) {
    test(`${route} renders ${text}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
});

test("protected pages require login or the right role", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "请先登录" })).toBeVisible();
  await page.goto("/merchant/products");
  await expect(page.getByRole("heading", { name: "403 无权访问" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "403 无权访问" })).toBeVisible();

  await login(page, "customer@example.com");
  await page.goto("/orders");
  await expect(page.getByText("订单 / 虚拟物流").first()).toBeVisible();
  await page.goto("/merchant/products");
  await expect(page.getByRole("heading", { name: "403 无权访问" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "403 无权访问" })).toBeVisible();

  await login(page, "merchant@example.com");
  await page.goto("/merchant/products");
  await expect(page.getByText("商家商品 / 店铺管理").first()).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "403 无权访问" })).toBeVisible();

  await login(page, "admin@example.com");
  await page.goto("/admin");
  await expect(page.getByText("管理员平台总览").first()).toBeVisible();
});

test("navigation marks the current page and mobile menu can close", async ({ page }) => {
  await page.goto("/orders");
  await expect(page.getByRole("link", { name: "订单 / 虚拟物流" })).toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "打开导航" });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "关闭导航", exact: true }).click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.click();
  await page.getByRole("link", { name: "商品 / 店铺管理" }).click();
  await expect(page).toHaveURL(/\/merchant\/products/);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test.describe("customer route smoke after login", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "customer@example.com");
  });

  for (const [route, text] of customerRoutes) {
    test(`${route} renders ${text}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
});

test.describe("merchant route smoke after login", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "merchant@example.com");
  });

  for (const [route, text] of merchantRoutes) {
    test(`${route} renders ${text}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
});

test.describe("admin route smoke after login", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com");
  });

  for (const [route, text] of adminRoutes) {
    test(`${route} renders ${text}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
});

test("customer can see login feedback", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "进入商城" }).click();
  await expect(page.getByText("登录成功，已进入顾客前台")).toBeVisible();
});

test("customer can logout and protected pages require login again", async ({ page }) => {
  await login(page, "customer@example.com");
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page.getByText("已退出登录")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "请先登录" })).toBeVisible();
});

test("customer profile updates flow into checkout defaults", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes("mobile");
  const suffix = isMobileProject ? "移动" : "桌面";
  const account = isMobileProject ? "profile-mobile@example.com" : "profile-desktop@example.com";
  const phone = isMobileProject ? "13800000102" : "13800000101";
  const address = `江西省南昌市红谷滩区资料验收路 ${suffix} 号`;

  await login(page, account);
  await page.goto("/account");
  const profileForm = page.locator("form").filter({ has: page.locator("#defaultAddress") });
  await profileForm.getByLabel("昵称").fill(`资料验收${suffix}`);
  await profileForm.getByLabel("联系电话").fill(phone);
  await profileForm.getByLabel("默认地址").fill(address);
  await profileForm.getByRole("button", { name: "保存资料" }).click();
  await expect(profileForm.getByText("个人资料已保存")).toBeVisible();

  await page.goto("/checkout");
  await expect(page.getByLabel("收货人")).toHaveValue(`资料验收${suffix}`);
  await expect(page.getByLabel("联系电话")).toHaveValue(phone);
  await expect(page.getByLabel("默认地址")).toHaveValue(address);
});

test("visitor can register a member and use the new profile at checkout", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes("mobile");
  const suffix = isMobileProject ? "mobile" : "desktop";
  const account = `new-${suffix}@example.com`;
  const nickname = isMobileProject ? "新会员移动" : "新会员桌面";
  const phone = isMobileProject ? "13800000202" : "13800000201";
  const address = `江西省南昌市红谷滩区注册验收路 ${isMobileProject ? "移动" : "桌面"} 号`;

  await page.goto("/account");
  const registerForm = page.locator("form").filter({ has: page.locator("#registerAddress") });
  await registerForm.getByLabel("手机号 / 邮箱").fill(account);
  await registerForm.getByLabel("昵称").fill(nickname);
  await registerForm.getByLabel("联系电话").fill(phone);
  await registerForm.getByLabel("默认地址").fill(address);
  await registerForm.getByRole("button", { name: "注册会员" }).click();
  await expect(page.getByText("注册成功，已进入顾客前台")).toBeVisible();

  await page.goto("/checkout");
  await expect(page.getByLabel("收货人")).toHaveValue(nickname);
  await expect(page.getByLabel("联系电话")).toHaveValue(phone);
  await expect(page.getByLabel("默认地址")).toHaveValue(address);
});

test("visitor registration shows duplicate account feedback", async ({ page }) => {
  await page.goto("/account");
  const registerForm = page.locator("form").filter({ has: page.locator("#registerAddress") });
  await registerForm.getByLabel("手机号 / 邮箱").fill("customer@example.com");
  await registerForm.getByLabel("联系电话").fill("13800000991");
  await registerForm.getByRole("button", { name: "注册会员" }).click();
  await expect(registerForm.getByText("手机号或邮箱已注册")).toBeVisible();
});

test("global search shows result links and empty feedback", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("搜索商品、店铺或订单号").fill("台灯");
  const searchResult = page.getByRole("link", { name: /商品\s+空气感智能台灯/ });
  await expect(searchResult).toBeVisible();
  await searchResult.click();
  await expect(page).toHaveURL(/\/products\/prod-lamp/);

  await page.goto("/");
  await page.getByLabel("搜索商品、店铺或订单号").fill("没有这个结果");
  await expect(page.getByText("无匹配结果")).toBeVisible();
});

test("global search keeps order results behind customer login", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("搜索商品、店铺或订单号").fill("MO20260528001");
  await expect(page.getByText("无匹配结果")).toBeVisible();

  await login(page, "customer@example.com");
  await page.getByLabel("搜索商品、店铺或订单号").fill("MO20260528001");
  await expect(page.getByRole("link", { name: /订单\s+MO20260528001/ })).toBeVisible();
});

test("global search exposes merchant-scoped products orders and after-sales", async ({ page }) => {
  await login(page, "merchant@example.com");

  await page.getByLabel("搜索商品、店铺或订单号").fill("MO20260528001");
  await expect(page.getByRole("link", { name: /商家订单\s+MO20260528001/ })).toBeVisible();

  await page.getByLabel("搜索商品、店铺或订单号").fill("颜色与预期不符");
  await expect(page.getByRole("link", { name: /售后\s+颜色与预期不符/ }).first()).toBeVisible();
});

test("global search exposes admin-scoped merchants banners and audit logs", async ({ page }) => {
  await login(page, "admin@example.com");

  await page.getByLabel("搜索商品、店铺或订单号").fill("潮流配件仓");
  await expect(page.getByRole("link", { name: /商家申请\s+潮流配件仓/ })).toBeVisible();

  await page.getByLabel("搜索商品、店铺或订单号").fill("桌面焕新季");
  await expect(page.getByRole("link", { name: /广告位\s+桌面焕新季/ })).toBeVisible();

  await page.getByLabel("搜索商品、店铺或订单号").fill("刷新首页缓存");
  await expect(page.getByRole("link", { name: /审计\s+刷新首页缓存/ })).toBeVisible();
});

test("home category filter narrows product discovery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "2 服饰配件" }).click();
  await expect(page).toHaveURL(/category=%E6%9C%8D%E9%A5%B0%E9%85%8D%E4%BB%B6/);
  await expect(page.getByRole("heading", { name: "服饰配件商品" })).toBeVisible();
  await expect(page.getByRole("link", { name: "防泼水通勤托特包" })).toBeVisible();
  await expect(page.getByRole("link", { name: "空气感智能台灯" })).toHaveCount(0);
});

test("home product cards show visible add-to-cart feedback", async ({ page }) => {
  await login(page, "customer@example.com");
  const cartNav = page.getByRole("link", { name: /购物车/ }).first();
  await expect(cartNav.locator(".count")).toHaveText("2");
  await page.goto("/");
  const productCard = page.locator(".product-card").filter({ hasText: "空气感智能台灯" });
  await productCard.getByRole("button", { name: "加入" }).click();
  await expect(productCard.getByRole("status")).toHaveText("已加入购物车");
  await expect(cartNav.locator(".count")).toHaveText("3");
});

test("optimized storefront media renders from seeded assets", async ({ page }) => {
  await page.goto("/");
  await expectLoadedImage(page, "桌面焕新季 Banner");

  await page.goto("/products/prod-lamp");
  await expectLoadedImage(page, "空气感智能台灯 商品主图");
  await expectLoadedImageBySource(page, "products%2Flamp.jpg");

  await login(page, "admin@example.com");
  await page.goto("/admin/home");
  await expectLoadedImage(page, "桌面焕新季 Banner 预览");
});

test("customer can add to cart and adjust cart quantities", async ({ page }) => {
  await login(page, "customer@example.com");
  const cartNav = page.getByRole("link", { name: /购物车/ }).first();
  await expect(cartNav.locator(".count")).toHaveText("2");

  await page.goto("/products/prod-lamp");
  await page.getByRole("button", { name: "加入购物车" }).click();
  await expect(page.getByText("已加入购物车：空气感智能台灯")).toBeVisible();
  await expect(cartNav.locator(".count")).toHaveText("3");

  await page.goto("/cart");
  await expect(page.getByText("应付合计", { exact: true })).toBeVisible();
  await expect(page.getByText("¥996")).toBeVisible();
  await page.getByRole("button", { name: "增加 空气感智能台灯 数量" }).click();
  await expect(page.getByText("购物车数量已更新为 3")).toBeVisible();
  await expect(page.getByText("小计 ¥987")).toBeVisible();
  await expect(page.getByText("¥1,325")).toBeVisible();

  await page.getByRole("button", { name: "减少 空气感智能台灯 数量" }).click();
  await expect(page.getByText("购物车数量已更新为 2")).toBeVisible();
  await expect(page.getByText("小计 ¥658")).toBeVisible();

  await page.getByRole("button", { name: "删除 空气感智能台灯" }).click();
  await expect(page.getByText("购物车商品已删除")).toBeVisible();
  await expect(page.getByText("模块化收纳套装")).toBeVisible();
  await expect(page.locator(".row").filter({ hasText: "空气感智能台灯" })).toHaveCount(0);
});

test("checkout validates and returns virtual payment feedback", async ({ page }) => {
  await login(page, "customer@example.com");
  await page.goto("/checkout");
  await page.getByRole("button", { name: "确认虚拟支付" }).click();
  await expect(page.getByRole("status").filter({ hasText: "虚拟支付成功" })).toBeVisible();
});

test("checkout shows field-level validation errors", async ({ page }) => {
  await login(page, "customer@example.com");
  await page.goto("/checkout");
  const checkoutForm = page.locator("form").filter({ has: page.locator("#receiver") });
  await checkoutForm.getByLabel("收货人").fill("");
  await checkoutForm.getByLabel("联系电话").fill("");
  await checkoutForm.getByLabel("默认地址").fill("短");
  await checkoutForm.getByRole("button", { name: "确认虚拟支付" }).click();
  await expect(checkoutForm.getByText("表单校验失败")).toBeVisible();
  await expect(checkoutForm.getByText("请输入收货人")).toBeVisible();
  await expect(checkoutForm.getByText("请输入联系电话")).toBeVisible();
  await expect(checkoutForm.getByText("请输入完整收货地址")).toBeVisible();
  await expect(checkoutForm.getByLabel("收货人")).toHaveAttribute("aria-invalid", "true");
  await expect(checkoutForm.getByLabel("默认地址")).toHaveValue("短");
});

test("customer can immediately buy from the product detail page", async ({ page }) => {
  await login(page, "customer@example.com");
  await page.goto("/products/prod-headphone");
  await page.getByRole("link", { name: "立即购买" }).click();
  await expect(page).toHaveURL(/\/checkout\?productId=prod-headphone&quantity=1/);
  await expect(page.getByText("立即购买")).toBeVisible();
  await expect(page.getByRole("heading", { name: "旅行降噪耳机" })).toBeVisible();

  await page.getByRole("button", { name: "确认虚拟支付" }).click();
  await expect(page.getByRole("status").filter({ hasText: "虚拟支付成功" })).toBeVisible();
});

test("customer sees failed virtual payment and can retry pending orders", async ({ page }) => {
  await login(page, "customer@example.com");
  await page.goto("/checkout");
  await page.getByLabel("虚拟支付方式").selectOption("fail");
  await page.getByRole("button", { name: "确认虚拟支付" }).click();
  await expect(page.getByText("虚拟支付失败")).toBeVisible();

  await page.goto("/orders");
  await expect(page.getByRole("cell", { name: "MO20260524003" })).toBeVisible();
  await expect(page.getByText("待支付")).toBeVisible();
  await page.getByRole("button", { name: "继续支付" }).click();
  await expect(page.getByRole("status").filter({ hasText: "虚拟支付成功" })).toBeVisible();
});

test("customer can confirm receipt and submit a product review", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes("mobile");
  const account = isMobileProject ? "review-mobile@example.com" : "review-desktop@example.com";
  const orderNo = isMobileProject ? "MO20260527010" : "MO20260527009";
  const orderItemId = isMobileProject ? "item-e2e-review-mobile" : "item-e2e-review-desktop";

  await login(page, account);
  await page.goto("/orders");
  const shippedOrder = page.getByRole("row").filter({ hasText: orderNo });
  await expect(shippedOrder.getByText("运输中")).toBeVisible();
  await shippedOrder.getByRole("button", { name: "确认收货" }).click();
  await expect(shippedOrder.getByText("已收货")).toBeVisible();

  await page.getByRole("link", { name: "去评价" }).click();
  await expect(page).toHaveURL(/\/after-sale/);
  const reviewForm = page.locator("form").filter({ has: page.locator("#orderItemId") });
  await reviewForm.getByLabel("选择订单商品").selectOption(orderItemId);
  await reviewForm.getByLabel("评价内容").fill("确认收货后补充评价，降噪表现稳定。");
  await reviewForm.getByRole("button", { name: "提交评价" }).click();
  await expect(page.getByText("评价已提交")).toBeVisible();

  await page.goto("/after-sale");
  const reviewedOption = page.locator("#orderItemId option").filter({ hasText: orderNo });
  await expect(reviewedOption).toContainText("已评价");
  await expect(reviewedOption).toBeDisabled();
});

test("customer can upload after-sale evidence before submitting", async ({ page }) => {
  await login(page, "customer@example.com");
  await page.goto("/after-sale");
  await page.locator('input[type="file"]').setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: pngUploadBuffer()
  });
  await page.getByRole("button", { name: "上传图片" }).click();
  await expect(page.getByText("图片上传成功")).toBeVisible();
  await expect(page.getByLabel("凭证图片")).toHaveValue(/\/uploads\/evidence-/);
});

test("customer after-sale submission syncs into merchant handling and customer status", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes("mobile");
  const account = isMobileProject ? "after-sale-mobile@example.com" : "after-sale-desktop@example.com";
  const orderNo = isMobileProject ? "MO20260527012" : "MO20260527011";
  const orderItemId = isMobileProject ? "item-e2e-after-sale-mobile" : "item-e2e-after-sale-desktop";
  const reason = isMobileProject ? "移动端换货同步" : "桌面端换货同步";
  const description = isMobileProject ? "移动端提交后由商家通过售后。" : "桌面端提交后由商家通过售后。";
  const reply = isMobileProject ? "移动端售后已通过，请等待换货。" : "桌面端售后已通过，请等待换货。";

  await login(page, account);
  await page.goto("/orders");
  const shippedOrder = page.getByRole("row").filter({ hasText: orderNo });
  await expect(shippedOrder.getByText("运输中")).toBeVisible();
  await shippedOrder.getByRole("button", { name: "确认收货" }).click();
  await expect(shippedOrder.getByText("已收货")).toBeVisible();

  await page.goto("/after-sale");
  const afterSaleForm = page.locator("form").filter({ has: page.locator("#afterOrderItemId") });
  await afterSaleForm.getByLabel("选择订单商品").selectOption(orderItemId);
  await afterSaleForm.getByLabel("原因").fill(reason);
  await afterSaleForm.getByLabel("说明").fill(description);
  await afterSaleForm.getByRole("button", { name: "发起售后" }).click();
  await expect(afterSaleForm.getByText("售后申请已提交")).toBeVisible();
  const submittedCustomerRecord = page.locator(".row").filter({ hasText: reason });
  await expect(submittedCustomerRecord.getByText(reason)).toBeVisible();
  await expect(submittedCustomerRecord.getByText("待处理")).toBeVisible();

  await login(page, "merchant@example.com");
  await page.goto("/merchant/orders?afterSaleStatus=REQUESTED");
  const afterSaleCard = page.locator(".ui-card").filter({ hasText: reason });
  await expect(afterSaleCard.getByText(description)).toBeVisible();
  await afterSaleCard.getByLabel("处理结果").selectOption("approve");
  await afterSaleCard.getByLabel("处理说明").fill(reply);
  await afterSaleCard.getByRole("button", { name: "提交处理" }).click();
  await expect(afterSaleCard).toHaveCount(0);

  await login(page, account);
  await page.goto("/after-sale");
  const customerRecord = page.locator(".row").filter({ hasText: reason });
  await expect(customerRecord.getByText("已通过", { exact: true })).toBeVisible();
  await expect(customerRecord.getByText(`商家处理：${reply}`)).toBeVisible();
});

test("merchant product upload rejects oversized files", async ({ page }) => {
  await login(page, "merchant@example.com");
  await page.goto("/merchant/products");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1)
  });
  await page.getByRole("button", { name: "上传图片" }).first().click();
  await expect(page.getByText("图片不能超过 2MB")).toBeVisible();
});

test("merchant can create a virtual waybill", async ({ page }, testInfo) => {
  const orderNo = testInfo.project.name.includes("mobile") ? "MO20260528009" : "MO20260528008";
  await login(page, "merchant@example.com");
  await page.goto("/merchant/orders?orderStatus=TO_SHIP");
  const orderRow = page.getByRole("row").filter({ hasText: orderNo });
  await expect(orderRow.getByText("待发货")).toBeVisible();
  await orderRow.getByRole("button", { name: "生成运单" }).click();
  await expect(orderRow).toHaveCount(0);

  await page.goto("/merchant/orders?orderStatus=SHIPPED");
  const shippedRow = await findPaginatedOrderRow(page, orderNo);
  await expect(shippedRow.getByText("运输中")).toBeVisible();
  await expect(shippedRow.getByText(/VL-\d{4}-\d{4}/)).toBeVisible();
});

test("merchant can filter and paginate order tables", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes("mobile");
  const afterSaleOrderNo = isMobileProject ? "MO20260526013" : "MO20260526012";
  const afterSaleText = isMobileProject ? "移动售后筛选：移动项目专用待处理售后。" : "桌面售后筛选：桌面项目专用待处理售后。";
  const afterSaleOrderPage = isMobileProject ? "2" : "1";

  await login(page, "merchant@example.com");
  await page.goto("/merchant/orders");
  await page.getByLabel("订单状态").selectOption("AFTER_SALE");
  await page.getByRole("button", { name: "筛选订单" }).click();
  await expect(page).toHaveURL(/orderStatus=AFTER_SALE/);
  if (afterSaleOrderPage !== "1") {
    await page.getByRole("link", { name: "下一页" }).first().click();
    await expect(page).toHaveURL(new RegExp(`orderPage=${afterSaleOrderPage}`));
  }
  await expect(page.getByRole("cell", { name: afterSaleOrderNo })).toBeVisible();

  await page.getByLabel("售后状态").selectOption("REQUESTED");
  await page.getByRole("button", { name: "筛选售后" }).click();
  await expect(page).toHaveURL(/afterSaleStatus=REQUESTED/);
  if (await page.getByText(afterSaleText).count() === 0) {
    await page.locator('a[href*="afterSalePage="]', { hasText: "下一页" }).click();
  }
  await expect(page.getByText(afterSaleText)).toBeVisible();
});

test("merchant can reject an after-sale request with a reply", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.includes("mobile");
  const afterSaleText = isMobileProject ? "移动售后筛选：移动项目专用待处理售后。" : "桌面售后筛选：桌面项目专用待处理售后。";

  await login(page, "merchant@example.com");
  await page.goto("/merchant/orders?afterSaleStatus=REQUESTED");
  if (await page.locator(".ui-card").filter({ hasText: afterSaleText }).count() === 0) {
    await page.locator('a[href*="afterSalePage="]', { hasText: "下一页" }).click();
  }
  const afterSaleCard = page.locator(".ui-card").filter({ hasText: afterSaleText });
  await afterSaleCard.getByLabel("处理结果").selectOption("reject");
  await afterSaleCard.getByLabel("处理说明").fill("商品不符合售后条件");
  await afterSaleCard.getByRole("button", { name: "提交处理" }).click();
  await expect(afterSaleCard).toHaveCount(0);
});

test("merchant can save store and product management forms", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name.includes("mobile") ? "移动" : "桌面";
  const productName = `商家同步新品${suffix}`;
  const updatedProductName = `商家同步新品${suffix} Pro`;
  const updatedDescription = `${suffix}端保存后前台商品详情应同步展示。`;

  await login(page, "merchant@example.com");
  await page.goto("/merchant/products");
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.first().setInputFiles({
    name: "bad.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("gif")
  });
  await page.getByRole("button", { name: "上传图片" }).first().click();
  await expect(page.getByText("仅支持 JPG 或 PNG 图片")).toBeVisible();
  await fileInputs.first().setInputFiles({
    name: "lamp.png",
    mimeType: "image/png",
    buffer: pngUploadBuffer()
  });
  await page.getByRole("button", { name: "上传图片" }).first().click();
  await expect(page.getByText("图片上传成功")).toBeVisible();
  await page.getByRole("button", { name: "保存店铺资料" }).click();
  await expect(page.getByText("店铺资料已保存")).toBeVisible();

  const publishForm = page.locator("form").filter({ has: page.locator("#imageUrl") });
  await publishForm.getByLabel("商品名称").fill(productName);
  await publishForm.getByLabel("价格（元）").fill("188");
  await publishForm.getByLabel("库存").fill("11");
  await publishForm.getByLabel("商品图片").fill("/products/charger.jpg");
  await publishForm.getByLabel("商品介绍").fill("发布后应同步出现在顾客首页。");
  await publishForm.getByRole("button", { name: "发布商品" }).click();
  await expect(publishForm.getByText("商品已发布到顾客前台")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: productName })).toBeVisible();

  await login(page, "merchant@example.com");
  await page.goto("/merchant/products");
  const productCard = page.locator(".ui-card").filter({ hasText: productName });
  await productCard.getByLabel("商品名称").fill(updatedProductName);
  await productCard.getByLabel("库存").fill("10");
  await productCard.getByLabel("商品图片").fill("/products/charger.jpg");
  await productCard.getByLabel("商品介绍").fill(updatedDescription);
  await productCard.getByRole("button", { name: "保存商品" }).click();
  await expect(productCard.getByText("商品资料已保存")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: updatedProductName }).click();
  await expect(page.getByRole("heading", { name: updatedProductName })).toBeVisible();
  await expect(page.getByText(updatedDescription)).toBeVisible();

  await page.goto("/merchant/products");
  await page.getByRole("row").filter({ hasText: updatedProductName }).getByRole("button", { name: "下架" }).click();
  await expect(page.getByText("商品已下架")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: updatedProductName })).toHaveCount(0);
});

test("merchant can filter and paginate products", async ({ page }) => {
  await login(page, "merchant@example.com");
  await page.goto("/merchant/products");
  await expect(page.getByText(/共 \d+ 条 · 第 1 \/ \d+ 页/).first()).toBeVisible();
  await page.getByRole("link", { name: "下一页" }).first().click();
  await expect(page).toHaveURL(/productPage=2/);
  await expect(page.getByText(/共 \d+ 条 · 第 2 \/ \d+ 页/).first()).toBeVisible();

  await page.getByLabel("商品状态").selectOption("ACTIVE");
  await page.getByRole("button", { name: "筛选商品" }).click();
  await expect(page).toHaveURL(/productStatus=ACTIVE/);
  await expect(page.getByRole("cell", { name: "销售中" }).first()).toBeVisible();
});

test("administrator rejection requires a reason", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/merchants");
  await page.getByRole("button", { name: "驳回" }).click();
  await expect(page.getByText("驳回必须填写原因")).toBeVisible();
});

test("administrator can freeze or review a store", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/merchants");
  await page.getByRole("button", { name: "冻结" }).first().click();
  await expect(page.getByText("店铺已冻结")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "空气感智能台灯" })).toHaveCount(0);

  await login(page, "admin@example.com");
  await page.goto("/admin/merchants");
  await page.getByRole("button", { name: "恢复" }).first().click();
  await expect(page.getByText("店铺已恢复经营")).toBeVisible();

  await reactivateMerchantProduct(page, "空气感智能台灯");
  await reactivateMerchantProduct(page, "旅行降噪耳机");

  await page.goto("/");
  await expect(page.getByRole("link", { name: "空气感智能台灯" })).toBeVisible();
});

test("administrator can filter and paginate merchant tables", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/merchants");
  await page.getByLabel("申请状态").selectOption("SUBMITTED");
  await page.getByLabel("店铺状态").selectOption("ACTIVE");
  await page.getByRole("button", { name: "筛选商家" }).click();
  await expect(page).toHaveURL(/applicationStatus=SUBMITTED/);
  await expect(page).toHaveURL(/storeStatus=ACTIVE/);
  await expect(page.getByRole("cell", { name: "潮流配件仓" })).toBeVisible();
  await expect(page.getByText("共 2 条 · 第 1 / 1 页")).toBeVisible();
});

test("administrator can edit home banner status and system settings", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/home");
  await page.locator('input[type="file"]').setInputFiles({
    name: "banner.png",
    mimeType: "image/png",
    buffer: pngUploadBuffer()
  });
  await page.getByRole("button", { name: "上传图片" }).click();
  await expect(page.getByText("图片上传成功")).toBeVisible();
  await expect(page.getByLabel("图片")).toHaveValue(/\/uploads\/banner-/);
  await page.getByRole("textbox", { name: "标题", exact: true }).fill("验收 Banner");
  await page.getByRole("textbox", { name: "副标题" }).fill("首页保存后同步展示");
  await page.getByRole("button", { name: "保存首页配置" }).click();
  await expect(page.getByText("首页配置已保存")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "验收 Banner" })).toBeVisible();
  await expect(page.getByText("首页保存后同步展示")).toBeVisible();

  await page.goto("/admin/home");
  await page.getByRole("textbox", { name: "标题", exact: true }).fill("桌面焕新季");
  await page.getByRole("textbox", { name: "副标题" }).fill("精选智能台灯、收纳与办公配件。");
  await page.getByLabel("图片").fill("/banners/desk-refresh.jpg");
  await page.getByLabel("上线状态").selectOption("OFFLINE");
  await page.getByRole("button", { name: "保存首页配置" }).click();
  await expect(page.getByText("首页配置已保存")).toBeVisible();

  await page.goto("/admin/system");
  await saveSystemSetting(page, "会员注册开关", "disabled");

  await page.goto("/account");
  await page.getByRole("button", { name: "注册会员" }).last().click();
  await expect(page.getByText("会员注册已暂停")).toBeVisible();

  await page.goto("/admin/system");
  await saveSystemSetting(page, "会员注册开关", "enabled");
  await saveSystemSetting(page, "商家入驻人工审核", "auto");

  await login(page, "customer@example.com");
  await page.goto("/merchant/apply");
  await page.getByRole("button", { name: "提交审核" }).click();
  await expect(page.getByText("开店申请已自动通过")).toBeVisible();

  await login(page, "admin@example.com");
  await page.goto("/admin/home");
  await page.getByLabel("上线状态").selectOption("ONLINE");
  await page.getByRole("button", { name: "保存首页配置" }).click();
  await expect(page.getByText("首页配置已保存")).toBeVisible();

  await page.goto("/admin/system");
  await saveSystemSetting(page, "商家入驻人工审核", "required");
});

test("administrator can filter audit logs", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/system");
  await page.getByLabel("角色").selectOption("MERCHANT");
  await page.getByLabel("对象类型").selectOption("Order");
  await page.getByRole("button", { name: "筛选日志" }).click();
  await expect(page).toHaveURL(/actorRole=MERCHANT/);
  await expect(page).toHaveURL(/targetType=Order/);
  await expect(page.getByRole("cell", { name: "极简生活旗舰店" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "MerchantApplication:apply-2" })).toHaveCount(0);

  await page.getByLabel("开始日期").fill("2026-05-28");
  await page.getByRole("button", { name: "筛选日志" }).click();
  await expect(page).toHaveURL(/startDate=2026-05-28/);
  await expect(page.getByText("暂无匹配审计日志")).toBeVisible();

  await page.getByLabel("关键词").fill("不存在的日志");
  await page.getByRole("button", { name: "筛选日志" }).click();
  await expect(page.getByText("暂无匹配审计日志")).toBeVisible();
});

test("@screenshots captures required viewports", async ({ page }, testInfo) => {
  test.setTimeout(180_000);

  let currentAccount = "";
  for (const shot of screenshotShots) {
    await page.setViewportSize(shot.size);
    if ("account" in shot && shot.account && shot.account !== currentAccount) {
      await login(page, shot.account);
      currentAccount = shot.account;
    } else if (!("account" in shot) || !shot.account) {
      currentAccount = "";
    }
    await page.goto(shot.route);
    await expect(page.locator("body")).toBeVisible();
    await prepareCleanScreenshot(page);
    await page.screenshot({
      path: `../../artifacts/ui-checks/${shot.name}.png`,
      fullPage: true
    });
    await testInfo.attach(shot.name, {
      path: `../../artifacts/ui-checks/${shot.name}.png`,
      contentType: "image/png"
    });
  }
});
