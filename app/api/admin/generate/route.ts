import { del, put } from "@vercel/blob";
import sharp from "sharp";
import { getLampmanAdmin } from "@/lib/admin-auth";
import { claimAiGenerationSlot, createBlogPost } from "@/db/blog";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    limitInputPixels: 40_000_000,
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("sanitized image has an invalid size");
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
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return typeof payload.output_text === "string" ? payload.output_text : null;
}

export async function POST(request: Request) {
  const user = await getLampmanAdmin();
  if (!user) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY ??
    request.headers.get("x-vercel-oidc-token") ??
    process.env.VERCEL_OIDC_TOKEN;
  const openAiKey = process.env.OPENAI_API_KEY;
  const apiToken = gatewayToken ?? openAiKey;
  if (!apiToken) {
    return Response.json(
      { error: "AI 연결 정보가 준비되지 않았습니다." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) return Response.json({ error: "현장 사진을 선택해주세요." }, { status: 400 });
  if (!ALLOWED_TYPES.has(image.type)) return Response.json({ error: "JPG, PNG, WEBP 이미지만 사용할 수 있습니다." }, { status: 400 });
  if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: "업로드용 이미지가 너무 큽니다. 다시 선택해주세요." }, { status: 400 });

  const city = String(formData.get("city") ?? "대전·청주").slice(0, 20);
  const service = String(formData.get("service") ?? "자동 분석").slice(0, 30);
  const notes = String(formData.get("notes") ?? "").slice(0, 1000);
  const bytes = await image.arrayBuffer();
  if (!hasExpectedSignature(new Uint8Array(bytes), image.type)) {
    return Response.json({ error: "파일 확장자와 실제 이미지 형식이 일치하지 않습니다." }, { status: 400 });
  }

  let hasQuota: boolean;
  try {
    hasQuota = await claimAiGenerationSlot(user.userId);
  } catch (error) {
    console.error("AI generation rate limit unavailable", error);
    return Response.json({ error: "콘텐츠 데이터베이스가 준비되지 않았습니다." }, { status: 503 });
  }
  if (!hasQuota) {
    return Response.json({ error: "AI 초안은 계정당 한 시간에 12회까지 만들 수 있습니다." }, { status: 429 });
  }

  let safeImage: Buffer;
  try {
    safeImage = await sanitizeImage(bytes);
  } catch (error) {
    console.error("Uploaded image sanitization failed", error);
    return Response.json({ error: "이미지를 안전하게 처리하지 못했습니다. 다른 사진으로 시도해주세요." }, { status: 422 });
  }

  const base64 = safeImage.toString("base64");
  const requestedModel = process.env.AI_MODEL
    ?? process.env.OPENAI_MODEL
    ?? (gatewayToken ? "openai/gpt-5.6-terra" : "gpt-5.6");
  const model = gatewayToken
    ? (requestedModel.includes("/") ? requestedModel : `openai/${requestedModel}`)
    : requestedModel.replace(/^openai\//, "");
  const aiEndpoint = gatewayToken
    ? "https://ai-gateway.vercel.sh/v1/responses"
    : "https://api.openai.com/v1/responses";

  const prompt = `당신은 대전·청주 24시간 전기 서비스 브랜드 '램프맨'의 콘텐츠 에디터입니다.
업로드된 현장 사진을 분석해 사람에게 실질적으로 도움이 되는 한국어 블로그 초안을 작성하세요.

운영자 입력:
- 지역: ${city}
- 콘텐츠 유형: ${service}
- 현장 메모: ${notes || "없음"}

중요 원칙:
1. 사진과 메모에서 확인할 수 없는 주소, 고객 발언, 정확한 고장 원인, 측정값, 작업 시간, 가격, 자격, 경력을 꾸며내지 마세요.
2. 실제 작업 완료를 단정할 근거가 없으면 '점검 시 확인할 내용'이나 '가이드' 형식으로 작성하세요.
3. 키워드를 부자연스럽게 반복하지 말고 대전/청주와 서비스 표현을 문맥에 맞게 사용하세요.
4. 전기 작업을 일반인이 따라 하도록 자세한 분해·배선 지시를 제공하지 마세요. 연기·불꽃·탄 냄새가 있으면 대피와 119 신고를 안내하세요.
5. 본문은 Markdown으로 작성하고, ## 소제목 4~6개와 필요한 경우 짧은 목록을 사용하세요.
6. slug는 영문 소문자와 하이픈만 사용하세요.
7. 최종 공개 전 사람이 검수할 초안입니다.`;

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
        input: [{ role: "user", content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: `data:image/webp;base64,${base64}`, detail: "high" },
        ] }],
        text: { format: { type: "json_schema", name: "lampman_blog_draft", strict: true, schema } },
        max_output_tokens: 6000,
      }),
    });
  } catch (error) {
    console.error("OpenAI draft request failed", error);
    return Response.json({ error: "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI draft generation failed", response.status, detail.slice(0, 500));
    return Response.json({ error: "AI가 초안을 만들지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const text = outputText(payload);
  if (!text) return Response.json({ error: "AI 응답에서 초안 내용을 찾지 못했습니다." }, { status: 502 });

  let draft: Record<string, string>;
  try {
    draft = JSON.parse(text) as Record<string, string>;
  } catch {
    return Response.json({ error: "AI 초안 형식을 읽지 못했습니다." }, { status: 502 });
  }

  const imagePath = `blog/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.webp`;
  let imageKey: string;
  try {
    const blob = await put(imagePath, safeImage, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
      cacheControlMaxAge: 31_536_000,
    });
    imageKey = blob.url;
  } catch (error) {
    console.error("Failed to store sanitized blog image", error);
    return Response.json({ error: "이미지 저장소에 연결하지 못했습니다." }, { status: 503 });
  }

  let id: string;
  try {
    id = await createBlogPost({
      slug: `${cleanSlug(draft.slug)}-${crypto.randomUUID().slice(0, 6)}`,
      title: String(draft.title).slice(0, 120),
      excerpt: String(draft.excerpt).slice(0, 300),
      content: String(draft.content).slice(0, 20000),
      city: String(draft.city || city).slice(0, 30),
      service: String(draft.service || service).slice(0, 50),
      imageKey,
      imageAlt: String(draft.imageAlt).slice(0, 180),
      seoTitle: String(draft.seoTitle).slice(0, 70),
      seoDescription: String(draft.seoDescription).slice(0, 180),
      aiModel: model,
    });
  } catch (error) {
    await del(imageKey).catch((cleanupError) => {
      console.error("Failed to remove orphaned blog image", cleanupError);
    });
    console.error("Failed to save AI blog draft", error);
    return Response.json({ error: "초안을 저장하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  return Response.json({ id });
}
