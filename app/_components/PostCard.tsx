import Image from "next/image";
import Link from "next/link";
import type { BlogRecord } from "@/db/blog";
import { bypassImageOptimization } from "@/lib/media";
import { postImageUrl } from "@/lib/posts";

export function PostCard({ post, featured = false }: { post: BlogRecord; featured?: boolean }) {
  const imageUrl = postImageUrl(post);
  const date = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(post.publishedAt ?? post.createdAt));

  return (
    <article className={`post-card ${featured ? "post-card-featured" : ""}`}>
      <Link className="post-image" href={`/blog/${post.slug}`} aria-label={post.title}>
        <Image
          src={imageUrl}
          alt={post.imageAlt}
          fill
          unoptimized={bypassImageOptimization(imageUrl)}
          sizes={featured ? "(max-width: 800px) 100vw, 58vw" : "(max-width: 800px) 100vw, 33vw"}
        />
        <span className="post-arrow" aria-hidden="true">↗</span>
      </Link>
      <div className="post-card-body">
        <div className="post-meta"><span>{post.service}</span><time>{date}</time></div>
        <h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3>
        <p>{post.excerpt}</p>
      </div>
    </article>
  );
}
