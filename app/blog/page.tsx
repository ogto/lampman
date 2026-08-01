import type { Metadata } from "next";
import { PostCard } from "@/app/_components/PostCard";
import { getPublishedPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "전기안전 노트",
  description: "누전, 정전, 차단기, 분전반과 조명·배선 공사에 관한 램프맨의 전기안전 가이드입니다.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "램프맨 전기안전 노트",
    description: "누전, 정전, 차단기, 분전반과 조명·배선 공사에 관한 현장 중심 전기안전 가이드입니다.",
    url: "/blog",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "램프맨 전기안전 노트",
    description: "대전·청주 현장 중심 전기안전 가이드",
    images: ["/og.png"],
  },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <main className="blog-page subpage">
      <section className="blog-hero">
        <div className="shell">
          <h1>전기를 쉽게, <em>현장은 솔직하게.</em></h1>
          <p>검색을 위한 문장보다 실제로 도움이 되는 증상 확인법과 현장 기준을 기록합니다.</p>
          <a className="blog-call" href={siteConfig.phoneHref}>24시간 긴급출동 {siteConfig.phoneDisplay} ↗</a>
          <div className="blog-filter" aria-label="콘텐츠 주제"><span className="active">전체</span><span>누전·차단기</span><span>정전</span><span>전기공사</span><span>조명</span></div>
        </div>
      </section>
      <section className="blog-list-section section-pad">
        <div className="shell blog-list-grid">
          {posts.map((post, index) => <PostCard post={post} featured={index === 0} key={post.slug} />)}
        </div>
      </section>
    </main>
  );
}
