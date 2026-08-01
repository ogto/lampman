import { getPublishedPosts } from "@/lib/posts";
import { configuredOrigin } from "@/lib/url";

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[char] ?? char);
}

export async function GET() {
  const origin = configuredOrigin();
  const posts = await getPublishedPosts();
  const staticPaths = ["", "/daejeon", "/daejeon/electrical-repair", "/daejeon/electrical-construction", "/cheongju", "/cheongju/electrical-repair", "/cheongju/electrical-construction", "/blog"];
  const urls = [
    ...staticPaths.map((path) => ({ loc: `${origin}${path}`, lastmod: "2026-08-01", priority: path === "" ? "1.0" : path === "/blog" ? "0.8" : "0.9" })),
    ...posts.map((post) => ({ loc: `${origin}/blog/${post.slug}`, lastmod: post.updatedAt.slice(0, 10), priority: "0.7" })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${item.lastmod}</lastmod><priority>${item.priority}</priority></url>`).join("\n")}\n</urlset>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
