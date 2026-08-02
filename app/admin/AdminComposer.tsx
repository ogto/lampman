"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_COUNT = 8;
const UPLOAD_CONCURRENCY = 3;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadStatus = "ready" | "uploading" | "uploaded" | "error";

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  blobUrl?: string;
  error?: string;
};

type GenerateResult = {
  id?: string;
  error?: string;
  code?: string;
  actionUrl?: string;
  preparedImages?: string[];
  sourceImages?: string[];
};

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function canvasToPreview(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("미리보기 변환 실패")),
      "image/jpeg",
      0.74,
    );
  });
}

async function createPreviewUrl(file: File): Promise<string> {
  if (typeof createImageBitmap !== "function") return URL.createObjectURL(file);

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("미리보기 변환 실패");
    context.fillStyle = "#11120f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return URL.createObjectURL(await canvasToPreview(canvas));
  } finally {
    bitmap.close();
  }
}

function uploadFilename(file: File, index: number): string {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70) || "lampman-field";
  return `${String(index + 1).padStart(2, "0")}-${base}.${extension}`;
}

function fileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

async function cleanupUploads(urls: string[]) {
  if (urls.length === 0) return;
  await fetch("/api/admin/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
    keepalive: true,
  }).catch(() => undefined);
}

export function AdminComposer() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionUrl, setActionUrl] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const dragDepthRef = useRef(0);
  const preparationCountRef = useRef(0);
  const previewUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function updateImages(updater: (current: SelectedImage[]) => SelectedImage[]) {
    const next = updater(imagesRef.current);
    imagesRef.current = next;
    setImages(next);
  }

  function patchImage(id: string, patch: Partial<SelectedImage>) {
    updateImages((current) => current.map((image) => image.id === id ? { ...image, ...patch } : image));
  }

  async function addFiles(fileList: FileList | File[]) {
    if (loading || imagesRef.current.length >= MAX_IMAGE_COUNT) return;
    preparationCountRef.current += 1;
    setPreparing(true);
    setMessage(null);
    setActionUrl(null);
    const incoming = Array.from(fileList);
    const candidates: SelectedImage[] = [];
    const errors: string[] = [];

    try {
      for (const file of incoming.slice(0, MAX_IMAGE_COUNT)) {
        if (!ALLOWED_TYPES.has(file.type)) {
          errors.push(`${file.name}: JPG, PNG, WEBP 파일만 사용할 수 있습니다.`);
          continue;
        }
        if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
          errors.push(`${file.name}: 사진 한 장은 20MB 이하여야 합니다.`);
          continue;
        }
        try {
          const previewUrl = await createPreviewUrl(file);
          previewUrlsRef.current.add(previewUrl);
          candidates.push({
            id: crypto.randomUUID(),
            file,
            previewUrl,
            status: "ready",
            progress: 0,
          });
        } catch {
          errors.push(`${file.name}: 사진 미리보기를 만들지 못했습니다.`);
        }
      }
      if (incoming.length > MAX_IMAGE_COUNT) {
        errors.push(`사진은 최대 ${MAX_IMAGE_COUNT}장까지 선택할 수 있습니다.`);
      }

      updateImages((current) => {
        const existing = new Set(current.map((image) => fileIdentity(image.file)));
        const next = [...current];
        for (const candidate of candidates) {
          const identity = fileIdentity(candidate.file);
          if (existing.has(identity) || next.length >= MAX_IMAGE_COUNT || loading) {
            URL.revokeObjectURL(candidate.previewUrl);
            previewUrlsRef.current.delete(candidate.previewUrl);
            if (next.length >= MAX_IMAGE_COUNT) errors.push(`사진은 최대 ${MAX_IMAGE_COUNT}장까지 선택할 수 있습니다.`);
            continue;
          }
          existing.add(identity);
          next.push(candidate);
        }
        return next;
      });
      if (errors.length > 0) setMessage([...new Set(errors)].join(" "));
    } finally {
      preparationCountRef.current -= 1;
      if (preparationCountRef.current === 0) setPreparing(false);
    }
  }

  function removeImage(id: string) {
    const target = images.find((image) => image.id === id);
    if (!target || loading) return;
    URL.revokeObjectURL(target.previewUrl);
    previewUrlsRef.current.delete(target.previewUrl);
    if (target.blobUrl) void cleanupUploads([target.blobUrl]);
    updateImages((current) => current.filter((image) => image.id !== id));
    setMessage(null);
    setActionUrl(null);
  }

  function moveImage(id: string, direction: -1 | 1) {
    if (loading) return;
    updateImages((current) => {
      const index = current.findIndex((image) => image.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      setLiveMessage(`${next[destination].file.name} 사진을 ${destination + 1}번째로 이동했습니다.`);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (images.length === 0 || loading || preparing) return;
    setLoading(true);
    setMessage(null);
    setActionUrl(null);

    const formData = new FormData(event.currentTarget);
    const snapshot = [...images];
    const uploadedUrls = new Map(
      snapshot.flatMap((image) => image.blobUrl ? [[image.id, image.blobUrl] as const] : []),
    );
    const batchId = crypto.randomUUID();

    try {
      const pending = snapshot.filter((image) => !image.blobUrl);
      for (let start = 0; start < pending.length; start += UPLOAD_CONCURRENCY) {
        const group = pending.slice(start, start + UPLOAD_CONCURRENCY);
        const results = await Promise.allSettled(group.map(async (image) => {
          const position = snapshot.findIndex((candidate) => candidate.id === image.id);
          patchImage(image.id, { status: "uploading", progress: 0, error: undefined });
          try {
            const blob = await upload(
              `draft-uploads/${batchId}/${uploadFilename(image.file, position)}`,
              image.file,
              {
                access: "public",
                handleUploadUrl: "/api/admin/uploads",
                contentType: image.file.type,
                multipart: false,
                clientPayload: JSON.stringify({ batchId, position }),
                onUploadProgress: ({ percentage }) => {
                  patchImage(image.id, { status: "uploading", progress: Math.round(percentage) });
                },
              },
            );
            uploadedUrls.set(image.id, blob.url);
            patchImage(image.id, { status: "uploaded", progress: 100, blobUrl: blob.url });
          } catch (error) {
            const detail = error instanceof Error ? error.message : "업로드 실패";
            patchImage(image.id, { status: "error", error: detail });
            throw new Error(`${image.file.name} 업로드에 실패했습니다. 다시 시도해주세요.`);
          }
        }));
        const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
        if (failure) throw failure.reason;
      }

      const orderedUrls = snapshot.map((image) => uploadedUrls.get(image.id)).filter((url): url is string => Boolean(url));
      if (orderedUrls.length !== snapshot.length) throw new Error("사진 업로드가 완료되지 않았습니다.");

      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: String(formData.get("city") ?? "대전·청주"),
          service: String(formData.get("service") ?? "자동 분석"),
          notes: String(formData.get("notes") ?? ""),
          images: orderedUrls,
        }),
      });
      const result = (await response.json()) as GenerateResult;

      if (Array.isArray(result.preparedImages) && result.preparedImages.length === snapshot.length) {
        const replacements = new Map(snapshot.map((image, index) => [image.id, result.preparedImages?.[index]]));
        updateImages((current) => current.map((image) => ({
          ...image,
          blobUrl: replacements.get(image.id) ?? image.blobUrl,
          status: "uploaded",
          progress: 100,
        })));
        if (Array.isArray(result.sourceImages)) void cleanupUploads(result.sourceImages);
      }

      if (!response.ok || !result.id) {
        setActionUrl(result.actionUrl ?? null);
        throw new Error(result.error ?? "AI 초안을 만들지 못했습니다.");
      }
      window.location.assign(`/admin/posts/${result.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 초안을 만들지 못했습니다.");
      setLoading(false);
    }
  }

  return (
    <form className="ai-composer" onSubmit={submit}>
      <div
        className={`upload-zone ${images.length > 0 ? "has-files" : ""} ${dragActive ? "is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (loading || preparing || images.length >= MAX_IMAGE_COUNT) return;
          dragDepthRef.current += 1;
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          const blocked = loading || preparing || images.length >= MAX_IMAGE_COUNT;
          event.dataTransfer.dropEffect = blocked ? "none" : "copy";
          if (!blocked) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragActive(false);
          if (loading || preparing || images.length >= MAX_IMAGE_COUNT) return;
          void addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id="admin-image-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          disabled={loading || preparing || images.length >= MAX_IMAGE_COUNT}
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <button
          className="upload-picker"
          type="button"
          aria-describedby="admin-upload-help"
          disabled={loading || preparing || images.length >= MAX_IMAGE_COUNT}
          onClick={() => inputRef.current?.click()}
        >
          <span className="upload-plus" aria-hidden="true">＋</span>
          <span>
            <strong>{dragActive ? "여기에 놓아주세요" : images.length > 0 ? "사진 더 추가하기" : "현장 사진을 끌어놓거나 선택하세요"}</strong>
            <small id="admin-upload-help">JPG · PNG · WEBP / 장당 최대 20MB / 최대 8장</small>
          </span>
          <b>{images.length}/{MAX_IMAGE_COUNT}</b>
        </button>

        {images.length > 0 && (
          <div className="upload-grid" aria-label="선택한 현장 사진">
            {images.map((image, index) => (
              <article className={`upload-card ${index === 0 ? "is-cover" : ""}`} key={image.id}>
                <div className="upload-thumb">
                  <Image src={image.previewUrl} alt={`선택한 현장 사진 ${index + 1}`} fill unoptimized sizes="180px" />
                  {index === 0 && <span className="cover-badge">대표 사진</span>}
                  {image.status === "uploading" && (
                    <span className="upload-progress" role="progressbar" aria-label={`${image.file.name} 업로드`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={image.progress}><i style={{ width: `${image.progress}%` }} />{image.progress}%</span>
                  )}
                  {image.status === "uploaded" && <span className="upload-complete">완료</span>}
                </div>
                <div className="upload-card-meta">
                  <span title={image.file.name}>{image.file.name}</span>
                  <small>{formatSize(image.file.size)}</small>
                </div>
                <div className="upload-card-actions">
                  <button type="button" onClick={() => moveImage(image.id, -1)} disabled={loading || index === 0} aria-label={`${image.file.name} 앞으로 이동`}>←</button>
                  <button type="button" onClick={() => moveImage(image.id, 1)} disabled={loading || index === images.length - 1} aria-label={`${image.file.name} 뒤로 이동`}>→</button>
                  <button type="button" onClick={() => removeImage(image.id)} disabled={loading} aria-label={`${image.file.name} 삭제`}>삭제</button>
                </div>
                {image.error && <p className="upload-card-error">{image.error}</p>}
              </article>
            ))}
          </div>
        )}
        {images.length > 0 && <p className="upload-guide">첫 번째 사진은 대표 이미지로, 나머지 사진은 글 본문 갤러리와 AI 분석에 함께 사용됩니다.</p>}
        <span className="sr-only" aria-live="polite">{liveMessage}</span>
      </div>

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
        <div className="composer-status" aria-live="polite">
          {message && <p className="admin-error" role="alert">{message}</p>}
          {actionUrl && <a className="admin-error-action" href={actionUrl} target="_blank" rel="noreferrer">Vercel AI 크레딧 충전하기 ↗</a>}
        </div>
        <button className="admin-generate" type="submit" disabled={images.length === 0 || loading || preparing}>
          {preparing
            ? <><span className="spinner" /> 미리보기 준비 중</>
            : loading
            ? <><span className="spinner" /> 사진 업로드·분석 후 초안 작성 중</>
            : <>AI 블로그 초안 만들기 <span>↗</span></>}
        </button>
      </div>
    </form>
  );
}
