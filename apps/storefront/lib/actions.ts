"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canConfirmReceive,
  canCreateShipment
} from "@minimal-mall/auth";
import type { OrderStatus } from "@minimal-mall/types";
import type { AfterSaleType, BannerStatus, ProductStatus, StoreStatus } from "@minimal-mall/types";
import { getMallWriteService } from "./services/mall-service";
import { clearSessionUser, requireActorId, setSessionUser } from "./session";
import { isUploadScope, saveUploadedImage, validateImageUpload } from "./upload";

export interface ActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string | string[]>;
  payload?: Record<string, string>;
}

const ok = (message: string, payload?: Record<string, string>): ActionState => ({
  ok: true,
  message,
  payload
});

const fail = (
  message: string,
  fieldErrors?: Record<string, string | string[]>
): ActionState => ({
  ok: false,
  message,
  fieldErrors
});

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const orderStatuses: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "AFTER_SALE"
];

function parseOrderStatus(value: string): OrderStatus | null {
  return orderStatuses.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

async function fileFromFormData(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

function revalidatePaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function loginAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    account: z.string().min(1, "请输入手机号或邮箱"),
    password: z.string().min(6, "密码至少 6 位")
  });
  const parsed = schema.safeParse({
    account: formValue(formData, "account"),
    password: formValue(formData, "password")
  });
  if (!parsed.success) {
    return fail("登录信息不完整", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const result = await getMallWriteService().login(parsed.data);
    await setSessionUser(result.user);
    revalidatePaths(["/", "/cart", "/checkout", "/orders", "/account", "/merchant/orders", "/admin"]);
    return ok(result.message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "登录失败");
  }
}

export async function registerAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    account: z.string().min(1, "请输入手机号或邮箱"),
    password: z.string().min(6, "密码至少 6 位"),
    nickname: z.string().min(1, "昵称不能为空"),
    contactPhone: z.string().min(6, "联系电话不能为空"),
    defaultAddress: z.string().min(8, "默认地址至少 8 个字")
  });
  const parsed = schema.safeParse({
    account: formValue(formData, "account"),
    password: formValue(formData, "password"),
    nickname: formValue(formData, "nickname"),
    contactPhone: formValue(formData, "contactPhone"),
    defaultAddress: formValue(formData, "defaultAddress")
  });
  if (!parsed.success) {
    return fail("注册信息不完整", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const result = await getMallWriteService().registerCustomer(parsed.data);
    await setSessionUser(result.user);
    revalidatePaths(["/", "/cart", "/checkout", "/orders", "/account"]);
    return ok(result.message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "注册失败");
  }
}

export async function logoutAction(): Promise<ActionState> {
  await clearSessionUser();
  revalidatePaths(["/", "/cart", "/checkout", "/orders", "/account", "/merchant/orders", "/admin"]);
  redirect("/account?status=logged-out");
}

export async function uploadImageAction(_: ActionState, formData: FormData) {
  try {
    const scope = formValue(formData, "scope") || "product";
    if (!isUploadScope(scope)) return fail("上传类型不支持");
    if (scope === "license" || scope === "evidence") {
      await requireActorId("customer");
    } else if (scope === "product") {
      await requireActorId("merchant");
    } else {
      await requireActorId("admin");
    }

    const file = await fileFromFormData(formData, "file");
    const validation = validateImageUpload(file);
    if (!validation.ok) return fail(validation.message, { file: validation.message });
    if (!file) return fail("请选择要上传的图片", { file: "请选择要上传的图片" });

    const result = await saveUploadedImage(scope, file);
    if (!result.ok) return fail(result.message, { file: result.message });

    return ok("图片上传成功", { imageUrl: result.imageUrl });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "图片上传失败");
  }
}

export async function saveProfileAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    nickname: z.string().min(1, "昵称不能为空"),
    contactPhone: z.string().min(6, "联系电话不能为空"),
    defaultAddress: z.string().min(8, "默认地址至少 8 个字")
  });
  const parsed = schema.safeParse({
    nickname: formValue(formData, "nickname"),
    contactPhone: formValue(formData, "contactPhone"),
    defaultAddress: formValue(formData, "defaultAddress")
  });
  if (!parsed.success) {
    return fail("资料保存失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().saveProfile({
      userId: await requireActorId("customer"),
      ...parsed.data
    });
    revalidatePaths(["/account", "/checkout"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "资料保存失败");
  }
}

export async function addCartAction(_: ActionState, formData: FormData) {
  const productId = formValue(formData, "productId");
  const productName = formValue(formData, "productName");
  const stock = Number(formValue(formData, "stock"));
  if (!productName) return fail("缺少商品信息");
  if (!Number.isFinite(stock) || stock < 1) return fail("库存不足，无法加入购物车");
  try {
    const result = await getMallWriteService().addCartItem({
      userId: await requireActorId("customer"),
      productId,
      productName,
      stock
    });
    revalidatePaths(["/", "/cart", "/checkout"]);
    return ok(result.message, { cartDelta: result.cartDelta });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "加入购物车失败");
  }
}

export async function updateCartQuantityAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    cartItemId: z.string().min(1, "缺少购物车商品"),
    quantity: z.coerce.number().int("数量必须是整数").min(1, "数量不能小于 1")
  });
  const parsed = schema.safeParse({
    cartItemId: formValue(formData, "cartItemId"),
    quantity: formValue(formData, "quantity")
  });
  if (!parsed.success) {
    return fail("购物车数量更新失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().updateCartQuantity({
      userId: await requireActorId("customer"),
      ...parsed.data
    });
    revalidatePaths(["/", "/cart", "/checkout"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "购物车数量更新失败");
  }
}

export async function removeCartItemAction(_: ActionState, formData: FormData) {
  const cartItemId = formValue(formData, "cartItemId");
  if (!cartItemId) return fail("缺少购物车商品");
  try {
    const message = await getMallWriteService().removeCartItem({
      userId: await requireActorId("customer"),
      cartItemId
    });
    revalidatePaths(["/", "/cart", "/checkout"]);
    return ok(message, { removedCartItemId: cartItemId });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "购物车商品删除失败");
  }
}

export async function checkoutAction(_: ActionState, formData: FormData) {
  const productId = formValue(formData, "productId");
  const schema = z.object({
    receiver: z.string().min(1, "请输入收货人"),
    phone: z.string().min(6, "请输入联系电话"),
    address: z.string().min(8, "请输入完整收货地址"),
    paymentMethod: z.string().min(1, "请选择虚拟支付方式"),
    productId: z.string().optional(),
    quantity: z.coerce.number().int("购买数量必须是整数").min(1, "购买数量不能小于 1").optional()
  });
  const parsed = schema.safeParse({
    receiver: formValue(formData, "receiver"),
    phone: formValue(formData, "phone"),
    address: formValue(formData, "address"),
    paymentMethod: formValue(formData, "paymentMethod"),
    productId: productId || undefined,
    quantity: productId ? formValue(formData, "quantity") || "1" : undefined
  });
  if (!parsed.success) {
    return fail("结算校验失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().checkout({
      userId: await requireActorId("customer"),
      ...parsed.data
    });
    revalidatePaths(["/", "/cart", "/checkout", "/orders", "/merchant/orders"]);
    if (parsed.data.paymentMethod === "fail") return fail(message);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "结算失败");
  }
}

export async function retryPaymentAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    orderNo: z.string().min(1, "缺少订单号"),
    paymentMethod: z.string().min(1, "请选择虚拟支付方式")
  });
  const parsed = schema.safeParse({
    orderNo: formValue(formData, "orderNo"),
    paymentMethod: formValue(formData, "paymentMethod") || "balance"
  });
  if (!parsed.success) {
    return fail("支付重试失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().retryPayment({
      userId: await requireActorId("customer"),
      ...parsed.data
    });
    revalidatePaths(["/orders", "/merchant/orders", "/admin"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "支付重试失败");
  }
}

export async function confirmReceiveAction(_: ActionState, formData: FormData) {
  const orderNo = formValue(formData, "orderNo");
  const status = parseOrderStatus(formValue(formData, "status"));
  if (!status || !canConfirmReceive(status)) return fail("只有运输中订单可以确认收货");
  try {
    const message = await getMallWriteService().confirmReceive({
      userId: await requireActorId("customer"),
      orderNo,
      status
    });
    revalidatePaths(["/orders", "/after-sale", "/merchant/orders"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "确认收货失败");
  }
}

export async function reviewAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    orderItemId: z.string().min(1, "请选择订单"),
    rating: z.coerce.number().min(1, "评分至少 1 分").max(5, "评分最高 5 分"),
    content: z.string().min(4, "评价内容至少 4 个字")
  });
  const parsed = schema.safeParse({
    orderItemId: formValue(formData, "orderItemId"),
    rating: formValue(formData, "rating"),
    content: formValue(formData, "content")
  });
  if (!parsed.success) {
    return fail("评价提交失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().submitReview({
      userId: await requireActorId("customer"),
      ...parsed.data
    });
    revalidatePaths(["/", "/orders", "/after-sale"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "评价提交失败");
  }
}

export async function afterSaleAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    orderItemId: z.string().min(1, "请选择订单商品"),
    type: z.string().min(1, "请选择售后类型"),
    reason: z.string().min(2, "请选择或填写原因"),
    description: z.string().min(4, "说明至少 4 个字"),
    evidenceUrl: z.string().optional()
  });
  const parsed = schema.safeParse({
    orderItemId: formValue(formData, "orderItemId"),
    type: formValue(formData, "type"),
    reason: formValue(formData, "reason"),
    description: formValue(formData, "description"),
    evidenceUrl: formValue(formData, "evidenceUrl") || undefined
  });
  if (!parsed.success) {
    return fail("售后申请失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().createAfterSale({
      userId: await requireActorId("customer"),
      ...parsed.data,
      type: parsed.data.type as AfterSaleType
    });
    revalidatePaths(["/orders", "/after-sale", "/merchant/orders", "/admin"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "售后申请失败");
  }
}

export async function merchantApplyAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    storeName: z.string().min(2, "店铺名称至少 2 个字"),
    categoryId: z.string().min(1, "请选择经营类目"),
    description: z.string().min(8, "店铺介绍至少 8 个字"),
    licenseImageUrl: z.string().min(1, "请上传或填写资质图片")
  });
  const parsed = schema.safeParse({
    storeName: formValue(formData, "storeName"),
    categoryId: formValue(formData, "categoryId"),
    description: formValue(formData, "description"),
    licenseImageUrl: formValue(formData, "licenseImageUrl")
  });
  if (!parsed.success) {
    return fail("开店申请未提交", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().submitMerchantApplication({
      userId: await requireActorId("customer"),
      ...parsed.data
    });
    revalidatePaths(["/merchant/apply", "/admin", "/admin/merchants"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "开店申请提交失败");
  }
}

export async function productPublishAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    storeId: z.string().min(1, "缺少店铺信息"),
    name: z.string().min(2, "商品名称至少 2 个字"),
    price: z.coerce.number().positive("价格必须大于 0"),
    stock: z.coerce.number().int("库存必须是整数").min(0, "库存不能小于 0"),
    categoryId: z.string().min(1, "请选择商品类目"),
    imageUrl: z.string().min(1, "请提供商品图片"),
    description: z.string().min(8, "商品介绍至少 8 个字")
  });
  const parsed = schema.safeParse({
    storeId: formValue(formData, "storeId"),
    name: formValue(formData, "name"),
    price: formValue(formData, "price"),
    stock: formValue(formData, "stock"),
    categoryId: formValue(formData, "categoryId"),
    imageUrl: formValue(formData, "imageUrl"),
    description: formValue(formData, "description")
  });
  if (!parsed.success) {
    return fail("商品发布失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().publishProduct({
      actorId: await requireActorId("merchant"),
      storeId: parsed.data.storeId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.price * 100),
      stock: parsed.data.stock,
      imageUrl: parsed.data.imageUrl,
      description: parsed.data.description
    });
    revalidatePaths(["/", "/merchant/products"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "商品发布失败");
  }
}

export async function saveStoreProfileAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    storeId: z.string().min(1, "缺少店铺信息"),
    name: z.string().min(2, "店铺名称至少 2 个字"),
    categoryId: z.string().min(1, "请选择经营类目"),
    description: z.string().min(8, "店铺介绍至少 8 个字")
  });
  const parsed = schema.safeParse({
    storeId: formValue(formData, "storeId"),
    name: formValue(formData, "name"),
    categoryId: formValue(formData, "categoryId"),
    description: formValue(formData, "description")
  });
  if (!parsed.success) {
    return fail("店铺资料保存失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().updateStoreProfile({
      actorId: await requireActorId("merchant"),
      ...parsed.data
    });
    revalidatePaths(["/", "/merchant/products", "/admin/merchants"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "店铺资料保存失败");
  }
}

export async function productUpdateAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    productId: z.string().min(1, "缺少商品信息"),
    storeId: z.string().min(1, "缺少店铺信息"),
    name: z.string().min(2, "商品名称至少 2 个字"),
    price: z.coerce.number().positive("价格必须大于 0"),
    stock: z.coerce.number().int("库存必须是整数").min(0, "库存不能小于 0"),
    categoryId: z.string().min(1, "请选择商品类目"),
    imageUrl: z.string().min(1, "请提供商品图片"),
    description: z.string().min(8, "商品介绍至少 8 个字")
  });
  const parsed = schema.safeParse({
    productId: formValue(formData, "productId"),
    storeId: formValue(formData, "storeId"),
    name: formValue(formData, "name"),
    price: formValue(formData, "price"),
    stock: formValue(formData, "stock"),
    categoryId: formValue(formData, "categoryId"),
    imageUrl: formValue(formData, "imageUrl"),
    description: formValue(formData, "description")
  });
  if (!parsed.success) {
    return fail("商品资料保存失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().updateProduct({
      actorId: await requireActorId("merchant"),
      productId: parsed.data.productId,
      storeId: parsed.data.storeId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.price * 100),
      stock: parsed.data.stock,
      imageUrl: parsed.data.imageUrl,
      description: parsed.data.description
    });
    revalidatePaths(["/", "/merchant/products", `/products/${parsed.data.productId}`]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "商品资料保存失败");
  }
}

export async function productStatusAction(_: ActionState, formData: FormData) {
  const productId = formValue(formData, "productId");
  const status = formValue(formData, "status") as ProductStatus;
  if (!productId || !["ACTIVE", "OFF_SHELF"].includes(status)) return fail("商品状态修改失败");
  try {
    const message = await getMallWriteService().updateProductStatus({
      actorId: await requireActorId("merchant"),
      productId,
      status
    });
    revalidatePaths(["/", "/cart", "/checkout", "/merchant/products", `/products/${productId}`]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "商品状态修改失败");
  }
}

export async function storeStatusAction(_: ActionState, formData: FormData) {
  const storeId = formValue(formData, "storeId");
  const status = formValue(formData, "status") as StoreStatus;
  if (!storeId || !["ACTIVE", "FROZEN"].includes(status)) return fail("店铺状态修改失败");
  try {
    const message = await getMallWriteService().updateStoreStatus({
      actorId: await requireActorId("admin"),
      storeId,
      status
    });
    revalidatePaths(["/", "/cart", "/checkout", "/admin/merchants", "/merchant/products"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "店铺状态修改失败");
  }
}

export async function createShipmentAction(_: ActionState, formData: FormData) {
  const orderNo = formValue(formData, "orderNo");
  const storeId = formValue(formData, "storeId");
  const status = parseOrderStatus(formValue(formData, "status"));
  if (!status || !canCreateShipment(status)) return fail("只有待发货订单可以生成运单");
  try {
    const result = await getMallWriteService().createShipment({
      actorId: await requireActorId("merchant"),
      storeId,
      orderNo,
      status
    });
    revalidatePaths(["/orders", "/merchant/orders"]);
    return ok(result.message, { trackingNo: result.trackingNo });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "运单生成失败");
  }
}

export async function handleAfterSaleAction(_: ActionState, formData: FormData) {
  const action = formValue(formData, "action");
  const afterSaleId = formValue(formData, "afterSaleId");
  const reply = formValue(formData, "reply");
  if (!reply) return fail("请填写处理说明", { reply: "请填写处理说明" });
  try {
    const message = await getMallWriteService().handleAfterSale({
      actorId: await requireActorId("merchant"),
      afterSaleId,
      action: action === "reject" ? "reject" : "approve",
      reply
    });
    revalidatePaths(["/orders", "/after-sale", "/merchant/orders", "/admin/system"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "售后处理失败");
  }
}

export async function merchantReviewAction(_: ActionState, formData: FormData) {
  const action = formValue(formData, "action");
  const applicationId = formValue(formData, "applicationId");
  const reason = formValue(formData, "reason");
  if (action === "reject" && !reason) {
    return fail("驳回必须填写原因", { reason: "请填写驳回原因" });
  }
  try {
    const message = await getMallWriteService().reviewMerchantApplication({
      actorId: await requireActorId("admin"),
      applicationId,
      action: action === "reject" ? "reject" : "approve",
      reason
    });
    revalidatePaths(["/", "/merchant/apply", "/admin", "/admin/merchants", "/merchant/products"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "商家审核失败");
  }
}

export async function saveHomeAction(_: ActionState, formData: FormData) {
  const schema = z.object({
    id: z.string().optional(),
    title: z.string().min(2, "Banner 标题不能为空"),
    subtitle: z.string().optional(),
    imageUrl: z.string().min(1, "请提供 Banner 图片"),
    linkUrl: z.string().min(1, "请提供跳转链接"),
    status: z.enum(["ONLINE", "OFFLINE"])
  });
  const parsed = schema.safeParse({
    id: formValue(formData, "bannerId") || undefined,
    title: formValue(formData, "title"),
    subtitle: formValue(formData, "subtitle") || undefined,
    imageUrl: formValue(formData, "imageUrl"),
    linkUrl: formValue(formData, "linkUrl"),
    status: formValue(formData, "status") as BannerStatus
  });
  if (!parsed.success) {
    return fail("首页配置保存失败", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  try {
    const message = await getMallWriteService().saveHomeBanner({
      actorId: await requireActorId("admin"),
      ...parsed.data
    });
    revalidatePaths(["/", "/admin/home", "/admin", "/admin/system"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "首页配置保存失败");
  }
}

export async function systemSettingAction(_: ActionState, formData: FormData) {
  const key = formValue(formData, "key");
  const value = formValue(formData, "value");
  if (!key) return fail("缺少配置项");
  try {
    const message = await getMallWriteService().updateSystemSetting({
      actorId: await requireActorId("admin"),
      key,
      value
    });
    revalidatePaths(["/admin/system"]);
    return ok(message);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "系统配置更新失败");
  }
}
