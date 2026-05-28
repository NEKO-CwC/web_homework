import { describe, expect, it } from "vitest";
import {
  isUploadScope,
  resolveUploadExtension,
  saveUploadedImage,
  uploadMaxBytes,
  validateImageUpload
} from "./upload";

function testArrayBuffer(value: string) {
  const bytes = new TextEncoder().encode(value);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

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

  it("returns a stable public path after writing an uploaded image", async () => {
    const writes: Array<{ path: string; data: Buffer }> = [];
    const result = await saveUploadedImage(
      "banner",
      {
        name: "hero.png",
        type: "image/png",
        arrayBuffer: async () => testArrayBuffer("png")
      },
      {
        cwd: "mall",
        now: () => 1000,
        randomId: () => "upload-id",
        mkdir: async () => undefined,
        writeFile: async (path, data) => {
          writes.push({ path: String(path), data: Buffer.from(data as Buffer) });
        }
      }
    );

    expect(result).toEqual({ ok: true, imageUrl: "/uploads/banner-1000-upload-id.png" });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toContain("public");
    expect(writes[0]?.path).toContain("banner-1000-upload-id.png");
  });

  it("returns clear feedback when image storage fails", async () => {
    await expect(saveUploadedImage(
      "product",
      {
        name: "product.png",
        type: "image/png",
        arrayBuffer: async () => testArrayBuffer("png")
      },
      {
        mkdir: async () => undefined,
        writeFile: async () => {
          throw new Error("disk full");
        }
      }
    )).resolves.toEqual({ ok: false, message: "图片上传失败，请稍后重试" });
  });

  it("simulates storage failure for page-level E2E outside production", async () => {
    await expect(saveUploadedImage(
      "product",
      {
        name: "__simulate-upload-failure.png",
        type: "image/png",
        arrayBuffer: async () => testArrayBuffer("png")
      },
      {
        writeFile: async () => {
          throw new Error("should not write simulated failures");
        }
      }
    )).resolves.toEqual({ ok: false, message: "图片上传失败，请稍后重试" });
  });
});
