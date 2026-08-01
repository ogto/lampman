import { getPublishedPosts } from "@/lib/posts";

function xml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[char] ?? char);
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const posts = await getPublishedPosts();
  const items = posts.map((post) => `<item><title>${xml(post.title)}</title><link>${origin}/blog/${post.slug}</link><guid>${origin}/blog/${post.slug}</guid><description>${xml(post.excerpt)}</description><pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate></item>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>램프맨 전기안전 노트</title><link>${origin}/blog</link><description>대전·청주 전기수리와 전기공사 현장 가이드</description><language>ko-KR</language>${items}</channel></rss>`;
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
}
