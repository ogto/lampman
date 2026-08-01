import { configuredOrigin } from "@/lib/url";

export function GET() {
  const origin = configuredOrigin();
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
