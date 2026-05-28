import { describe, expect, it } from "vitest";
import { isUploadScope, resolveUploadExtension, uploadMaxBytes, validateImageUpload } from "./upload";

describe("image upload validation", () => {
  it("accepts JPG and PNG files within the size limit", () => {
    expect(validateImageUpload({ type: "image/jpeg", size: uploadMaxBytes })).toEqual({ ok: true });
    expect(validateImageUpload({ type: "image/png", size: 1024 })).toEqual({ ok: true });
  });

  it("rejects missing, unsupported, and oversized files", () => {
    expect(validateImageUpload(null)).toMatchObject({ ok: false, message: "请选择要上传的图片" });
    expect(validateImageUpload({ type: "image/gif", size: 1024 })).toMatchObject({ ok: false, message: "仅支持 JPG 或 PNG 图片" });
    expect(validateImageUpload({ type: "image/png", size: uploadMaxBytes + 1 })).toMatchObject({ ok: false, message: "图片不能超过 2MB" });
  });

  it("normalizes upload extensions from safe filenames and mime type", () => {
    expect(resolveUploadExtension("license.jpeg", "image/jpeg")).toBe(".jpg");
    expect(resolveUploadExtension("product.png", "image/png")).toBe(".png");
    expect(resolveUploadExtension("unsafe.gif", "image/png")).toBe(".png");
  });

  it("allows evidence uploads as a supported scope", () => {
    expect(isUploadScope("evidence")).toBe(true);
    expect(isUploadScope("avatar")).toBe(false);
  });
});
