export const DEFAULT_POST_IMAGE = "/images/breaker-diagnosis.png";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function encodeMediaPath(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Converts the value stored in blog.imageKey into a renderable image URL.
 *
 * New posts store the public URL returned by Vercel Blob. Seed posts use
 * root-relative files from /public, while pre-migration rows can still contain
 * an object pathname that is resolved by the legacy /media route.
 */
export function mediaUrl(imageKey: string | null | undefined): string {
  const value = imageKey?.trim();
  if (!value) return DEFAULT_POST_IMAGE;
  if (isHttpUrl(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  const pathname = encodeMediaPath(value);
  return pathname ? `/media/${pathname}` : DEFAULT_POST_IMAGE;
}

export function isRemoteMediaUrl(value: string): boolean {
  return isHttpUrl(value);
}

export function bypassImageOptimization(value: string): boolean {
  return isRemoteMediaUrl(value) || value.startsWith("/media/");
}

export function absoluteMediaUrl(value: string, origin: string): string {
  if (isRemoteMediaUrl(value)) return value;
  return new URL(value, origin.endsWith("/") ? origin : `${origin}/`).toString();
}
