import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthenticatedUser, ProtectedArea } from "@minimal-mall/auth";
import { canAccessArea } from "@minimal-mall/auth";
import { getPrismaClient, isPrismaDataMode } from "./data/db";

export const SESSION_COOKIE_NAME = "minimal_mall_session";

const fallbackSessionSecret = "minimal-mall-course-demo-session-secret";

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET ?? fallbackSessionSecret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function encodeSession(user: AuthenticatedUser) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    role: user.role,
    email: user.email ?? null,
    phone: user.phone ?? null,
    storeIds: user.storeIds ?? []
  })).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(value: string): AuthenticatedUser | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthenticatedUser;
    if (!parsed.id || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  const sessionUser = cookie ? decodeSession(cookie.value) : null;
  if (!sessionUser || !isPrismaDataMode()) return sessionUser;

  const db = await getPrismaClient();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      role: true,
      status: true,
      email: true,
      phone: true,
      stores: { select: { id: true } }
    }
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    role: user.role,
    status: user.status,
    email: user.email,
    phone: user.phone,
    storeIds: user.stores.map((store) => store.id)
  };
}

export async function setSessionUser(user: AuthenticatedUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getActorId(fallbackId: string) {
  const user = await getCurrentSessionUser();
  return user?.id ?? fallbackId;
}

export async function requireSessionUser(area: ProtectedArea) {
  const user = await getCurrentSessionUser();
  if (canAccessArea(user, area)) return { user, denied: null };
  if (!user) {
    const target = area === "merchant" ? "卖家中心或开店申请" : area === "admin" ? "管理后台" : "购物车、订单和售后页面";
    return {
      user: null,
      denied: {
        title: "请先登录",
        message: `请登录后访问${target}。`,
        actionHref: "/account",
        actionLabel: "登录或注册"
      }
    };
  }

  if (area === "merchant") {
    return {
      user: null,
      denied: {
        title: "当前账号不能访问卖家中心",
        message: "你可以申请开店，或切换到已通过审核的商家账号。",
        actionHref: "/merchant/apply",
        actionLabel: "申请开店"
      }
    };
  }

  if (area === "admin") {
    return {
      user: null,
      denied: {
        title: "当前账号不能访问管理后台",
        message: "请切换到管理员账号，或返回商城继续浏览商品。",
        actionHref: "/account",
        actionLabel: "切换账号"
      }
    };
  }

  return {
    user: null,
    denied: {
      title: "当前账号不能访问此页面",
      message: "请切换为顾客账号，或返回商城继续浏览商品。",
      actionHref: "/account",
      actionLabel: "切换账号"
    }
  };
}

export async function requireActorId(area: ProtectedArea) {
  const { user } = await requireSessionUser(area);
  if (!user) throw new Error(area === "customer" ? "请先登录后再操作" : "当前账号无权执行该操作");
  return user.id;
}
