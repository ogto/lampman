"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
    formData.set("image", file);

    try {
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
            <small>JPG, PNG, WEBP · 최대 10MB</small>
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
