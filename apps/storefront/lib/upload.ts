import { extname } from "node:path";

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
