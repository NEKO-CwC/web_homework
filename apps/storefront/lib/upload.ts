import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { join } from "node:path";

export const uploadMaxBytes = 2 * 1024 * 1024;

export type UploadScope = "license" | "product" | "banner" | "evidence";

export const allowedUploadTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"]
]);

export function isUploadScope(value: string): value is UploadScope {
  return value === "license" || value === "product" || value === "banner" || value === "evidence";
}

export function validateImageUpload(file: { size: number; type: string } | null) {
  if (!file || file.size === 0) {
    return { ok: false as const, message: "请选择要上传的图片" };
  }
  if (!allowedUploadTypes.has(file.type)) {
    return { ok: false as const, message: "仅支持 JPG 或 PNG 图片" };
  }
  if (file.size > uploadMaxBytes) {
    return { ok: false as const, message: "图片不能超过 2MB" };
  }
  return { ok: true as const };
}

export function resolveUploadExtension(fileName: string, mimeType: string) {
  const expectedExtension = allowedUploadTypes.get(mimeType) ?? ".jpg";
  const originalExtension = extname(fileName).toLowerCase();
  const safeExtension = originalExtension === ".jpeg" ? ".jpg" : originalExtension;
  return [".jpg", ".png"].includes(safeExtension) ? safeExtension : expectedExtension;
}

type UploadFile = {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type UploadStorage = {
  cwd?: string;
  now?: () => number;
  randomId?: () => string;
  mkdir?: typeof mkdir;
  writeFile?: typeof writeFile;
};

function shouldSimulateUploadFailure(fileName: string) {
  return process.env.NODE_ENV !== "production" && fileName.startsWith("__simulate-upload-failure");
}

export async function saveUploadedImage(scope: UploadScope, file: UploadFile, storage: UploadStorage = {}) {
  if (shouldSimulateUploadFailure(file.name)) {
    return { ok: false as const, message: "图片上传失败，请稍后重试" };
  }

  const finalExtension = resolveUploadExtension(file.name, file.type);
  const relativePath = `/uploads/${scope}-${storage.now?.() ?? Date.now()}-${storage.randomId?.() ?? randomUUID()}${finalExtension}`;
  const publicDir = join(storage.cwd ?? process.cwd(), "public");
  const uploadDir = join(publicDir, "uploads");
  const target = join(publicDir, relativePath);
  const writeUploadDir = storage.mkdir ?? mkdir;
  const writeUploadFile = storage.writeFile ?? writeFile;

  try {
    await writeUploadDir(uploadDir, { recursive: true });
    await writeUploadFile(target, Buffer.from(await file.arrayBuffer()));
    return { ok: true as const, imageUrl: relativePath };
  } catch {
    return { ok: false as const, message: "图片上传失败，请稍后重试" };
  }
}
