import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthenticatedUser, ProtectedArea } from "@minimal-mall/auth";
import { canAccessArea } from "@minimal-mall/auth";

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
  return cookie ? decodeSession(cookie.value) : null;
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
  return {
    user: null,
    denied: {
      title: area === "customer" ? "请先登录" : "403 无权访问",
      message: area === "customer" ? "请登录后访问购物车、订单和售后页面。" : "当前账号无权访问该工作台。"
    }
  };
}

export async function requireActorId(area: ProtectedArea) {
  const { user } = await requireSessionUser(area);
  if (!user) throw new Error(area === "customer" ? "请先登录后再操作" : "当前账号无权执行该操作");
  return user.id;
}
