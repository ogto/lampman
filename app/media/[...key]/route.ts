import { BlobNotFoundError, head } from "@vercel/blob";

export const runtime = "nodejs";

function legacyPathname(segments: string[]): string | null {
  if (
    !segments.length
    || segments.some((segment) => (
      !segment
      || segment === "."
      || segment === ".."
      || segment.includes("\\")
      || segment.includes("\0")
    ))
  ) {
    return null;
  }
  return segments.join("/");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const pathname = legacyPathname(key);
  if (!pathname) return new Response("Not found", { status: 404 });

  try {
    const blob = await head(pathname);
    return new Response(null, {
      status: 307,
      headers: {
        location: blob.url,
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return new Response("Not found", { status: 404 });
    }
    console.error("Failed to resolve legacy media pathname", error);
    return new Response("Media unavailable", { status: 503 });
  }
}
