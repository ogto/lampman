export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
