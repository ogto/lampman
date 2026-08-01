import { copy, del, head, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  claimAiGenerationSlot,
  createBlogPost,
  releaseAiGenerationSlot,
} from "@/db/blog";
import { getLampmanAdmin } from "@/lib/admin-auth";

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PREPARED_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_COUNT = 8;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const STAGING_PREFIX = "draft-uploads/";
const PREPARED_PREFIX = "draft-prepared/";
const FINAL_PREFIX = "blog/posts/";
const AI_BILLING_URL = "https://vercel.com/ogtos-projects/~/ai?modal=add-credit-card";

type GenerateRequest = {
  city?: unknown;
  service?: unknown;
  notes?: unknown;
  images?: unknown;
};

type UpstreamError = {
  error?: {
    type?: string;
    code?: string;
    message?: string;
  };
};

export const runtime = "nodejs";
export const maxDuration = 300;

function hasExpectedSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (type === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function sanitizeImage(source: ArrayBuffer): Promise<Buffer> {
  const bytes = await sharp(Buffer.from(source), {
    failOn: "error",
    limitInputPixels: 80_000_000,
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  if (!bytes.byteLength || bytes.byteLength > MAX_PREPARED_IMAGE_BYTES) {
    throw new Error("SANITIZED_IMAGE_TOO_LARGE");
  }
  return bytes;
}

function cleanSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || `field-note-${Date.now()}`;
}

function outputText(payload: Record<string, unknown>): string | null {
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (
        part
        && typeof part === "object"
        && (part as { type?: unknown }).type === "output_text"
        && typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return typeof payload.output_text === "string" ? payload.output_text : null;
}

function jsonError(
  error: string,
  status: number,
  options: {
    code?: string;
    actionUrl?: string;
    preparedImages?: string[];
    sourceImages?: string[];
  } = {},
) {
  return Response.json({ error, ...options }, { status });
}

async function readUpstreamError(response: Response): Promise<UpstreamError> {
  const text = await response.text();
  try {
    return JSON.parse(text) as UpstreamError;
  } catch {
    return { error: { message: text.slice(0, 500) } };
  }
}

function upstreamErrorResponse(
  response: Response,
  detail: UpstreamError,
  preparedImages: string[],
  sourceImages: string[],
) {
  const type = detail.error?.type ?? detail.error?.code ?? "";
  const message = detail.error?.message ?? "";
  const billingRequired =
    type === "customer_verification_required"
    || response.status === 402
    || /credit card|credits|billing/i.test(message);

  if (billingRequired) {
    return jsonError(
      "Vercel AI 사용을 위해 결제수단 확인이 필요합니다. 결제카드를 등록하거나 OPENAI_API_KEY를 연결한 뒤 다시 눌러주세요.",
      402,
      {
        code: "AI_BILLING_REQUIRED",
        actionUrl: AI_BILLING_URL,
        preparedImages,
        sourceImages,
      },
    );
  }
  if (response.status === 429) {
    return jsonError(
      "AI 요청이 잠시 몰렸습니다. 잠시 후 다시 시도해주세요.",
      429,
      { code: "AI_RATE_LIMITED", preparedImages, sourceImages },
    );
  }
  return jsonError(
    "AI가 초안을 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
    502,
    { code: "AI_UPSTREAM_ERROR", preparedImages, sourceImages },
  );
}

async function prepareImages(urls: string[]): Promise<{
  preparedImages: string[];
  sourceImages: string[];
}> {
  const preparedImages: string[] = [];
  const sourceImages: string[] = [];
  const createdPreparedImages: string[] = [];
  const year = new Date().getUTCFullYear();

  try {
    for (const url of urls) {
      const metadata = await head(url);
      const pathname = metadata.pathname;

      if (pathname.startsWith(PREPARED_PREFIX)) {
        if (metadata.contentType !== "image/webp" || metadata.size > MAX_PREPARED_IMAGE_BYTES) {
          throw new Error("INVALID_PREPARED_IMAGE");
        }
        preparedImages.push(metadata.url);
        continue;
      }

      if (!pathname.startsWith(STAGING_PREFIX)) throw new Error("INVALID_IMAGE_LOCATION");
      if (!metadata.contentType || !ALLOWED_TYPES.has(metadata.contentType)) {
        throw new Error("INVALID_IMAGE_TYPE");
      }
      if (!metadata.size || metadata.size > MAX_SOURCE_IMAGE_BYTES) {
        throw new Error("INVALID_IMAGE_SIZE");
      }
      sourceImages.push(metadata.url);

      const sourceId = createHash("sha256").update(metadata.url).digest("hex").slice(0, 32);
      const preparedPath = `${PREPARED_PREFIX}${year}/${sourceId}.webp`;
      try {
        const existing = await head(preparedPath);
        if (
          existing.contentType === "image/webp"
          && existing.size > 0
          && existing.size <= MAX_PREPARED_IMAGE_BYTES
        ) {
          preparedImages.push(existing.url);
          continue;
        }
      } catch {
        // This source has not been prepared yet.
      }

      const sourceResponse = await fetch(metadata.url, { cache: "no-store" });
      if (!sourceResponse.ok) throw new Error("IMAGE_DOWNLOAD_FAILED");
      const source = await sourceResponse.arrayBuffer();
      if (source.byteLength !== metadata.size || source.byteLength > MAX_SOURCE_IMAGE_BYTES) {
        throw new Error("INVALID_IMAGE_SIZE");
      }
      if (!hasExpectedSignature(new Uint8Array(source), metadata.contentType)) {
        throw new Error("INVALID_IMAGE_SIGNATURE");
      }

      const safeImage = await sanitizeImage(source);
      const blob = await put(preparedPath, safeImage, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/webp",
        cacheControlMaxAge: 3600,
      });
      preparedImages.push(blob.url);
      createdPreparedImages.push(blob.url);
    }
  } catch (error) {
    if (createdPreparedImages.length > 0) {
      await del(createdPreparedImages).catch((cleanupError) => {
        console.error("Failed to clean partially prepared images", cleanupError);
      });
    }
    throw error;
  }

  return { preparedImages, sourceImages };
}

async function finalizeImages(preparedImages: string[]): Promise<string[]> {
  const finalImages: string[] = [];
  const year = new Date().getUTCFullYear();
  try {
    for (const [index, preparedImage] of preparedImages.entries()) {
      const path = `${FINAL_PREFIX}${year}/${crypto.randomUUID()}-${index + 1}.webp`;
      const blob = await copy(preparedImage, path, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "image/webp",
        cacheControlMaxAge: 31_536_000,
      });
      finalImages.push(blob.url);
    }
    return finalImages;
  } catch (error) {
    if (finalImages.length > 0) await del(finalImages).catch(() => undefined);
    throw error;
  }
}

async function releaseReservation(reservationId: string, userId: string) {
  await releaseAiGenerationSlot(reservationId, userId).catch((error) => {
    console.error("Failed to release AI generation reservation", error);
  });
}

export async function POST(request: Request) {
  const user = await getLampmanAdmin();
  if (!user) return jsonError("관리자 로그인이 필요합니다.", 401);

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return jsonError("요청 형식이 올바르지 않습니다.", 400);
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((value): value is string => typeof value === "string")
    : [];
  const uniqueImages = [...new Set(images)];
  if (uniqueImages.length === 0) return jsonError("현장 사진을 한 장 이상 선택해주세요.", 400);
  if (uniqueImages.length !== images.length || uniqueImages.length > MAX_IMAGE_COUNT) {
    return jsonError(`사진은 중복 없이 최대 ${MAX_IMAGE_COUNT}장까지 사용할 수 있습니다.`, 400);
  }

  const city = String(body.city ?? "대전·청주").slice(0, 20);
  const service = String(body.service ?? "자동 분석").slice(0, 30);
  const notes = String(body.notes ?? "").slice(0, 1000);

  const openAiKey = process.env.OPENAI_API_KEY;
  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY
    ?? request.headers.get("x-vercel-oidc-token")
    ?? process.env.VERCEL_OIDC_TOKEN;
  const apiToken = openAiKey ?? gatewayToken;
  const usingGateway = !openAiKey && Boolean(gatewayToken);
  if (!apiToken) {
    return jsonError(
      "AI 연결 정보가 없습니다. Vercel AI Gateway를 연결하거나 OPENAI_API_KEY를 등록해주세요.",
      503,
      { code: "AI_NOT_CONFIGURED" },
    );
  }

  let preparedImages: string[];
  let sourceImages: string[];
  try {
    ({ preparedImages, sourceImages } = await prepareImages(uniqueImages));
  } catch (error) {
    console.error("Uploaded image preparation failed", error);
    return jsonError(
      "사진을 안전하게 처리하지 못했습니다. JPG, PNG, WEBP 형식과 장당 20MB 제한을 확인해주세요.",
      422,
    );
  }

  let reservationId: string | null;
  try {
    reservationId = await claimAiGenerationSlot(user.userId);
  } catch (error) {
    console.error("AI generation rate limit unavailable", error);
    return jsonError(
      "콘텐츠 데이터베이스에 연결하지 못했습니다.",
      503,
      { preparedImages, sourceImages },
    );
  }
  if (!reservationId) {
    return jsonError(
      "AI 초안은 계정당 한 시간에 12개까지 만들 수 있습니다.",
      429,
      { preparedImages, sourceImages },
    );
  }

  const requestedModel = usingGateway
    ? (process.env.AI_MODEL ?? "openai/gpt-5.6-terra")
    : (process.env.OPENAI_MODEL ?? "gpt-5.4");
  const model = usingGateway
    ? (requestedModel.includes("/") ? requestedModel : `openai/${requestedModel}`)
    : requestedModel.replace(/^openai\//, "");
  const aiEndpoint = usingGateway
    ? "https://ai-gateway.vercel.sh/v1/responses"
    : "https://api.openai.com/v1/responses";

  const prompt = `당신은 대전·청주 24시간 전기 서비스 브랜드 '램프맨'의 콘텐츠 에디터입니다.
업로드된 현장 사진 ${preparedImages.length}장을 순서대로 분석해 사람이 직접 쓴 것처럼 자연스럽고 신뢰할 수 있는 한국어 블로그 초안을 작성하세요. 첫 번째 사진은 대표 이미지이며 나머지는 본문 갤러리에 함께 노출됩니다.

운영자 입력:
- 지역: ${city}
- 콘텐츠 유형: ${service}
- 현장 메모: ${notes || "없음"}

중요 원칙:
1. 사진과 메모에서 확인할 수 없는 주소, 고객 발언, 정확한 고장 원인, 측정값, 작업 시간, 가격, 자격, 경력은 꾸며내지 마세요.
2. 실제 작업 완료를 단정할 근거가 없으면 '자가 확인용 내용'이나 '가이드' 형식으로 작성하세요.
3. 키워드를 부자연스럽게 반복하지 말고 대전·청주와 서비스 표현을 문맥에 맞게 사용하세요.
4. 전기 작업은 일반인이 따라 하지 않도록 자세한 분해·배선 지시를 제공하지 마세요. 연기·불꽃·탄 냄새가 있으면 전원 차단과 119 신고를 안내하세요.
5. 본문은 Markdown으로 작성하고, ## 소제목 4~6개와 필요한 경우 짧은 목록을 사용하세요.
6. slug는 영문 소문자와 하이픈만 사용하세요.
7. 여러 사진에서 확인되는 공통점과 차이를 자연스럽게 반영하되 사진마다 사실을 추측하지 마세요.
8. 최종 공개 전 사람이 검수할 초안입니다.`;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      slug: { type: "string" },
      title: { type: "string" },
      excerpt: { type: "string" },
      content: { type: "string" },
      city: { type: "string" },
      service: { type: "string" },
      imageAlt: { type: "string" },
      seoTitle: { type: "string" },
      seoDescription: { type: "string" },
    },
    required: ["slug", "title", "excerpt", "content", "city", "service", "imageAlt", "seoTitle", "seoDescription"],
  };

  let response: Response;
  try {
    response = await fetch(aiEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        safety_identifier: user.userId,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...preparedImages.map((imageUrl) => ({
              type: "input_image",
              image_url: imageUrl,
              detail: "auto",
            })),
          ],
        }],
        text: { format: { type: "json_schema", name: "lampman_blog_draft", strict: true, schema } },
        max_output_tokens: 6000,
      }),
    });
  } catch (error) {
    console.error("AI draft request failed", error);
    await releaseReservation(reservationId, user.userId);
    return jsonError(
      "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
      502,
      { code: "AI_CONNECTION_FAILED", preparedImages, sourceImages },
    );
  }

  if (!response.ok) {
    const detail = await readUpstreamError(response);
    console.error("AI draft generation failed", response.status, {
      type: detail.error?.type,
      code: detail.error?.code,
      message: detail.error?.message?.slice(0, 300),
    });
    await releaseReservation(reservationId, user.userId);
    return upstreamErrorResponse(response, detail, preparedImages, sourceImages);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("AI response JSON parsing failed", error);
    await releaseReservation(reservationId, user.userId);
    return jsonError(
      "AI 응답을 읽지 못했습니다. 다시 시도해주세요.",
      502,
      { code: "AI_INVALID_RESPONSE", preparedImages, sourceImages },
    );
  }
  const text = outputText(payload);
  if (!text) {
    await releaseReservation(reservationId, user.userId);
    return jsonError(
      "AI 응답에서 초안 내용을 찾지 못했습니다.",
      502,
      { code: "AI_EMPTY_RESPONSE", preparedImages, sourceImages },
    );
  }

  let draft: Record<string, string>;
  try {
    draft = JSON.parse(text) as Record<string, string>;
  } catch {
    await releaseReservation(reservationId, user.userId);
    return jsonError(
      "AI 초안 형식을 읽지 못했습니다. 다시 시도해주세요.",
      502,
      { code: "AI_INVALID_RESPONSE", preparedImages, sourceImages },
    );
  }

  let finalImages: string[];
  try {
    finalImages = await finalizeImages(preparedImages);
  } catch (error) {
    console.error("Failed to finalize blog images", error);
    return jsonError(
      "블로그 사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      503,
      { code: "IMAGE_FINALIZE_FAILED", preparedImages, sourceImages },
    );
  }

  let id: string;
  try {
    id = await createBlogPost({
      slug: `${cleanSlug(String(draft.slug ?? ""))}-${crypto.randomUUID().slice(0, 6)}`,
      title: String(draft.title ?? "현장 전기 안전 기록").slice(0, 120),
      excerpt: String(draft.excerpt ?? "").slice(0, 300),
      content: String(draft.content ?? "").slice(0, 20000),
      city: String(draft.city || city).slice(0, 30),
      service: String(draft.service || service).slice(0, 50),
      imageKey: finalImages[0],
      imageKeys: finalImages,
      imageAlt: String(draft.imageAlt ?? "현장 전기 점검 사진").slice(0, 180),
      seoTitle: String(draft.seoTitle ?? draft.title ?? "램프맨 전기 안전 기록").slice(0, 70),
      seoDescription: String(draft.seoDescription ?? draft.excerpt ?? "").slice(0, 180),
      aiModel: model,
    });
  } catch (error) {
    await del(finalImages).catch((cleanupError) => {
      console.error("Failed to remove unreferenced final images", cleanupError);
    });
    console.error("Failed to save AI blog draft", error);
    return jsonError(
      "초안을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      500,
      { code: "DRAFT_SAVE_FAILED", preparedImages, sourceImages },
    );
  }

  await del([...preparedImages, ...sourceImages]).catch((error) => {
    console.error("Failed to remove temporary draft images", error);
  });
  return Response.json({ id });
}
