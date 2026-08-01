import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLampmanAdmin } from "@/lib/admin-auth";
import { findBlogPostById } from "@/db/blog";
import { postImageUrl, postImageUrls } from "@/lib/posts";
import { publishPostAction, savePostAction, unpublishPostAction } from "@/app/admin/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; unpublished?: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params, searchParams }: Props) {
  await requireLampmanAdmin("/admin");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await findBlogPostById(id);
  if (!post) notFound();
  const imageUrls = postImageUrls(post);
  const additionalImageUrls = imageUrls.slice(1);

  return (
    <main className="admin-page admin-editor-page">
      <section className="admin-shell">
        <header className="editor-header">
          <div><Link href="/admin">← 콘텐츠 스튜디오</Link><span className={`status-pill ${post.status}`}>{post.status === "published" ? "발행됨" : "AI 초안"}</span></div>
          <h1>초안 검수 및 편집</h1>
          {query.saved && <p className="saved-message">변경사항을 저장했습니다.</p>}
          {query.unpublished && <p className="saved-message">공개를 중지하고 초안으로 전환했습니다.</p>}
        </header>

        <div className="editor-layout">
          <div className="editor-main">
            {post.imageKey && <div className="editor-image"><Image src={postImageUrl(post)} alt={post.imageAlt} fill unoptimized sizes="760px" /></div>}
            {additionalImageUrls.length > 0 && (
              <section className="editor-gallery" aria-label="업로드된 추가 사진">
                {additionalImageUrls.map((imageUrl, index) => (
                  <figure className="editor-gallery-item" key={imageUrl}>
                    <div className="editor-gallery-image">
                      <Image
                        src={imageUrl}
                        alt={`${post.imageAlt} 추가 사진 ${index + 2}`}
                        fill
                        unoptimized
                        sizes="(max-width: 760px) 50vw, 360px"
                      />
                    </div>
                    <figcaption>추가 사진 {index + 1}</figcaption>
                  </figure>
                ))}
              </section>
            )}
            <form action={savePostAction} className="editor-form" id="post-edit-form">
              <input type="hidden" name="id" value={post.id} />
              <label><span>제목</span><input name="title" defaultValue={post.title} required /></label>
              <label><span>요약</span><textarea name="excerpt" defaultValue={post.excerpt} rows={3} required /></label>
              <label><span>본문 <small>Markdown</small></span><textarea className="content-editor" name="content" defaultValue={post.content} rows={26} required /></label>
              <div className="admin-field-grid">
                <label><span>지역</span><input name="city" defaultValue={post.city} required /></label>
                <label><span>서비스</span><input name="service" defaultValue={post.service} required /></label>
              </div>
              <label><span>이미지 설명</span><input name="imageAlt" defaultValue={post.imageAlt} required /></label>
              <div className="seo-editor">
                <div><span>SEARCH PREVIEW</span><strong>{post.seoTitle}</strong><p>{post.seoDescription}</p></div>
                <label><span>SEO 제목</span><input name="seoTitle" defaultValue={post.seoTitle} required /></label>
                <label><span>SEO 설명</span><textarea name="seoDescription" defaultValue={post.seoDescription} rows={3} required /></label>
                <label><span>URL 슬러그</span><div className="slug-input"><b>/blog/</b><input name="slug" defaultValue={post.slug} required pattern="[a-z0-9-]+" /></div></label>
              </div>
              <button className="admin-save" type="submit">변경사항 저장</button>
            </form>
          </div>
          <aside className="editor-sidebar">
            <div><span>생성 모델</span><strong>{post.aiModel ?? "직접 작성"}</strong></div>
            <div><span>마지막 수정</span><strong>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.updatedAt))}</strong></div>
            <p>사진과 실제 현장이 일치하는지, 지역·작업 내용·안전 안내에 추측이 없는지 확인한 뒤 발행하세요.</p>
            {post.status === "draft" ? (
              <form action={publishPostAction}><input type="hidden" name="id" value={post.id} /><button className="admin-publish" type="submit">검수 완료 · 발행하기 ↗</button></form>
            ) : (
              <>
                <Link className="admin-publish" href={`/blog/${post.slug}`}>공개 글 보기 ↗</Link>
                <form action={unpublishPostAction}><input type="hidden" name="id" value={post.id} /><button className="admin-unpublish" type="submit">공개 중지</button></form>
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
