"use client";

import { Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@minimal-mall/ui";
import { uploadImageAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {
  ok: false,
  message: ""
};

export function ImageUploadField({
  id,
  name,
  label,
  defaultValue,
  scope
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  scope: "license" | "product" | "banner" | "evidence";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(defaultValue);
  const [feedback, setFeedback] = useState<ActionState>(initialState);
  const [isPending, startTransition] = useTransition();

  function uploadSelectedFile() {
    const file = fileInputRef.current?.files?.[0];
    const formData = new FormData();
    if (file) formData.set("file", file);
    formData.set("scope", scope);
    setFeedback(initialState);
    startTransition(async () => {
      const result = await uploadImageAction(initialState, formData);
      setFeedback(result);
      if (result.ok && result.payload?.imageUrl) {
        setImageUrl(result.payload.imageUrl);
      }
    });
  }

  return (
    <>
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input id={id} name={name} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
      </div>
      <div className="upload-box">
        <div className="upload-control">
          <strong>上传 JPG / PNG 图片</strong>
          <span>单张不超过 2MB，上传成功后会自动填入图片路径。</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" />
          <Button type="button" variant="secondary" disabled={isPending} onClick={uploadSelectedFile}>
            <Upload size={16} /> {isPending ? "上传中..." : "上传图片"}
          </Button>
          {feedback.message ? (
            <div className={`form-feedback ${feedback.ok ? "success" : "danger"}`} role="status" aria-live="polite">
              {feedback.message}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
