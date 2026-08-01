import { env } from "cloudflare:workers";

type MediaEnv = { MEDIA?: R2Bucket };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const bucket = (env as unknown as MediaEnv).MEDIA;
  if (!bucket) return new Response("Not found", { status: 404 });
  const { key } = await params;
  const object = await bucket.get(key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") ?? "public, max-age=31536000, immutable");
  if (request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
