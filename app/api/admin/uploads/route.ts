import { del, head, list } from "@vercel/blob";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { after } from "next/server";
import { getLampmanAdmin } from "@/lib/admin-auth";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_DELETE_COUNT = 8;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_STAGING_PATH = /^draft-uploads\/[a-z0-9-]{12,80}\/[a-z0-9._-]{1,140}$/;
const TEMPORARY_BLOB_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let lastCleanupScheduledAt = 0;

export const runtime = "nodejs";

function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return new URL(origin).origin === new URL(request.url).origin;
}

async function cleanupExpiredTemporaryBlobs() {
  const cutoff = Date.now() - TEMPORARY_BLOB_MAX_AGE_MS;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "draft-", limit: 1000, cursor });
    const expired = page.blobs
      .filter((blob) => blob.uploadedAt.getTime() < cutoff)
      .map((blob) => blob.url);
    if (expired.length > 0) await del(expired);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

function scheduleTemporaryBlobCleanup() {
  const now = Date.now();
  if (now - lastCleanupScheduledAt < 60 * 60 * 1000) return;
  lastCleanupScheduledAt = now;
  after(async () => {
    await cleanupExpiredTemporaryBlobs().catch((error) => {
      console.error("[admin-upload] temporary Blob cleanup failed", error);
    });
  });
}

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "업로드 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const admin = await getLampmanAdmin();
        if (!admin) throw new Error("UNAUTHORIZED");
        if (!sameOriginRequest(request)) throw new Error("INVALID_ORIGIN");
        if (!ALLOWED_STAGING_PATH.test(pathname)) throw new Error("INVALID_PATH");

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 3600,
          validUntil: Date.now() + 10 * 60 * 1000,
          tokenPayload: JSON.stringify({ userId: admin.userId }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info("[admin-upload] completed", {
          pathname: blob.pathname,
          contentType: blob.contentType,
        });
      },
    });
    scheduleTemporaryBlobCleanup();
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    console.error("[admin-upload] token request failed", { message });
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return Response.json(
      { error: status === 401 ? "관리자 로그인이 필요합니다." : "사진 업로드를 준비하지 못했습니다." },
      { status },
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await getLampmanAdmin();
  if (!admin) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  if (!sameOriginRequest(request)) return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });

  let urls: string[];
  try {
    const body = (await request.json()) as { urls?: unknown };
    urls = Array.isArray(body.urls)
      ? body.urls.filter((value): value is string => typeof value === "string").slice(0, MAX_DELETE_COUNT)
      : [];
  } catch {
    urls = [];
  }
  if (urls.length === 0) return Response.json({ ok: true });

  const removable: string[] = [];
  for (const url of urls) {
    try {
      const metadata = await head(url);
      if (
        metadata.pathname.startsWith("draft-uploads/") ||
        metadata.pathname.startsWith("draft-prepared/")
      ) {
        removable.push(metadata.url);
      }
    } catch {
      // Already removed or outside this Blob store.
    }
  }
  if (removable.length > 0) await del(removable);
  return Response.json({ ok: true });
}
