"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_BYTES = 3_800_000;
const MAX_IMAGE_DIMENSION = 2000;

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("이미지를 변환하지 못했습니다.")),
      "image/webp",
      quality,
    );
  });
}

async function prepareImageUpload(file: File): Promise<File> {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("원본 사진은 10MB 이하로 올려주세요.");
  }
  if (typeof createImageBitmap !== "function") {
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error("이 브라우저에서는 큰 사진을 자동 최적화할 수 없습니다. 더 작은 사진을 선택해주세요.");
    }
    return file;
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("이미지를 변환하지 못했습니다.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let optimized: Blob | null = null;
    for (const quality of [0.85, 0.72, 0.58]) {
      optimized = await canvasToWebp(canvas, quality);
      if (optimized.size <= MAX_UPLOAD_IMAGE_BYTES) break;
    }
    if (!optimized || optimized.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error("사진 용량을 충분히 줄이지 못했습니다. 다른 사진을 선택해주세요.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "lampman-field";
    return new File([optimized], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export function AdminComposer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function selectFile(nextFile: File | null) {
    setMessage(null);
    if (nextFile && nextFile.size > MAX_SOURCE_IMAGE_BYTES) {
      setMessage("원본 사진은 10MB 이하로 올려주세요.");
      nextFile = null;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextPreview;
    setFile(nextFile);
    setPreview(nextPreview);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      const uploadFile = await prepareImageUpload(file);
      formData.set("image", uploadFile);
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error ?? "초안을 만들지 못했습니다.");
      }
      window.location.href = `/admin/posts/${result.id}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안을 만들지 못했습니다.");
      setLoading(false);
    }
  }

  return (
    <form className="ai-composer" onSubmit={submit}>
      <label className={`upload-zone ${preview ? "has-preview" : ""}`}>
        {preview ? (
          <Image src={preview} alt="업로드 이미지 미리보기" fill unoptimized sizes="480px" />
        ) : (
          <span className="upload-placeholder">
            <b>＋</b>
            <strong>현장 사진 올리기</strong>
            <small>JPG, PNG, WEBP · 원본 최대 10MB · 자동 최적화</small>
          </span>
        )}
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className="composer-fields">
        <div className="admin-field-grid">
          <label>
            <span>지역</span>
            <select name="city" defaultValue="대전·청주">
              <option>대전·청주</option>
              <option>대전</option>
              <option>청주</option>
            </select>
          </label>
          <label>
            <span>콘텐츠 유형</span>
            <select name="service" defaultValue="자동 분석">
              <option>자동 분석</option>
              <option>전기수리</option>
              <option>전기공사</option>
              <option>누전·차단기</option>
              <option>조명공사</option>
            </select>
          </label>
        </div>
        <label>
          <span>현장 메모 <small>선택</small></span>
          <textarea name="notes" placeholder="예: 청주 흥덕구 상가, 펜던트 조명 교체 전 점검 사진" rows={4} />
        </label>
        <div className="ai-notice">
          <span aria-hidden="true">✦</span>
          <p>AI는 사진에서 확인되는 사실만 사용해 초안을 만듭니다. 주소·진단·비용처럼 사진만으로 알 수 없는 내용은 임의로 작성하지 않습니다.</p>
        </div>
        {message && <p className="admin-error" role="alert">{message}</p>}
        <button className="admin-generate" type="submit" disabled={!file || loading}>
          {loading ? <><span className="spinner" /> 사진 분석하고 초안 만드는 중</> : <>AI 블로그 초안 만들기 <span>↗</span></>}
        </button>
      </div>
    </form>
  );
}
