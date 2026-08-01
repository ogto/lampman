import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactBand } from "@/app/_components/ContactBand";
import { JsonLd } from "@/app/_components/JsonLd";
import { MarkdownArticle } from "@/app/_components/MarkdownArticle";
import { getPublishedPost, postImageUrl } from "@/lib/posts";
import { seedPosts } from "@/lib/seed-posts";
import { getRequestOrigin } from "@/lib/url";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return seedPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle.replace(/\s*\|\s*램프맨$/, ""),
    description: post.seoDescription,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt, url: `/blog/${post.slug}`, images: [postImageUrl(post)] },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: [postImageUrl(post)] },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, origin] = await Promise.all([getPublishedPost(slug), getRequestOrigin()]);
  if (!post) notFound();
  const imageUrl = postImageUrl(post);
  const date = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(post.publishedAt ?? post.createdAt));

  return (
    <main className="article-page subpage">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.excerpt,
        image: `${origin}${postImageUrl(post)}`,
        datePublished: post.publishedAt ?? post.createdAt,
        dateModified: post.updatedAt,
        author: { "@type": "Organization", name: "램프맨" },
        publisher: { "@type": "Organization", name: "램프맨" },
        mainEntityOfPage: `${origin}/blog/${post.slug}`,
      }} />
      <header className="article-header">
        <div className="shell article-header-inner">
          <div className="breadcrumbs"><Link href="/">홈</Link><span>/</span><Link href="/blog">전기안전 노트</Link></div>
          <div className="article-meta"><span>{post.city}</span><span>{post.service}</span><time>{date}</time></div>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
        </div>
      </header>
      <div className="article-image shell">
        <Image src={imageUrl} alt={post.imageAlt} fill priority unoptimized={imageUrl.startsWith("/media/")} sizes="(max-width: 1100px) 100vw, 1100px" />
      </div>
      <article className="article-body shell">
        <aside><span>램프맨 전기안전 노트</span><p>대전·청주 24시간 전기출동 현장에서 필요한 기준을 정리합니다.</p><a href={siteConfig.phoneHref}>긴급전화 {siteConfig.phoneDisplay} ↗</a></aside>
        <MarkdownArticle content={post.content} />
      </article>
      <div className="article-disclaimer shell"><strong>안전 안내</strong><p>이 글은 일반적인 정보입니다. 연기·불꽃·강한 탄 냄새가 있거나 물에 젖은 전기설비는 직접 만지지 말고 대피 후 119와 전문 기술자에게 연락하세요.</p></div>
      <ContactBand />
    </main>
  );
}
