import Link from "next/link";
import { listAllBlogPosts } from "@/db/blog";
import { requireLampmanAdmin } from "@/lib/admin-auth";
import { AdminComposer } from "./AdminComposer";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireLampmanAdmin("/admin");
  const posts = await listAllBlogPosts().catch(() => []);
  const published = posts.filter((post) => post.status === "published").length;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <div><p>LAMPMAN CONTENT STUDIO</p><h1>사진 한 장에서<br />검색되는 기록으로.</h1></div>
          <div className="admin-user"><span>{user.displayName}</span><Link href="/">사이트 보기 ↗</Link></div>
        </header>

        <div className="admin-stats">
          <div><span>전체 콘텐츠</span><strong>{posts.length}</strong></div>
          <div><span>발행 완료</span><strong>{published}</strong></div>
          <div><span>검수 대기</span><strong>{posts.length - published}</strong></div>
        </div>

        <section className="admin-section">
          <div className="admin-section-heading"><div><span>01</span><h2>새 AI 초안</h2></div><p>사진을 올리면 SEO 필드까지 자동으로 구성합니다.</p></div>
          <AdminComposer />
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><span>02</span><h2>콘텐츠 관리</h2></div><p>AI 초안은 반드시 검수한 뒤 공개됩니다.</p></div>
          <div className="admin-post-list">
            {posts.length ? posts.map((post) => (
              <Link href={`/admin/posts/${post.id}`} key={post.id}>
                <span className={`status-pill ${post.status}`}>{post.status === "published" ? "발행" : "초안"}</span>
                <div><strong>{post.title}</strong><small>{post.city} · {post.service}</small></div>
                <time>{new Intl.DateTimeFormat("ko-KR").format(new Date(post.updatedAt))}</time>
                <b>↗</b>
              </Link>
            )) : <div className="admin-empty">첫 현장 사진을 올려 램프맨의 기록을 시작하세요.</div>}
          </div>
        </section>
      </section>
    </main>
  );
}
