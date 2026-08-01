import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "__Host-lampman_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

type AdminSessionPayload = {
  version: 1;
  subject: "lampman-admin";
  issuedAt: number;
  expiresAt: number;
};

function sessionSecret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export function adminAuthConfigurationError(): string | null {
  if (!process.env.ADMIN_PASSWORD) {
    return "ADMIN_PASSWORD 환경 변수가 설정되지 않았습니다.";
  }
  if (!sessionSecret()) {
    return "ADMIN_SESSION_SECRET 환경 변수에 32자 이상의 임의 문자열을 설정해야 합니다.";
  }
  return null;
}

export function verifyAdminPassword(candidate: string): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD ?? "";
  const candidateDigest = createHash("sha256").update(candidate, "utf8").digest();
  const configuredDigest = createHash("sha256")
    .update(configuredPassword, "utf8")
    .digest();

  const matches = timingSafeEqual(candidateDigest, configuredDigest);
  return configuredPassword.length > 0 && matches;
}

export function createAdminSessionToken(now = Date.now()): string | null {
  const secret = sessionSecret();
  if (!secret) return null;

  const issuedAt = Math.floor(now / 1000);
  const payload: AdminSessionPayload = {
    version: 1,
    subject: "lampman-admin",
    issuedAt,
    expiresAt: issuedAt + ADMIN_SESSION_MAX_AGE,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encodedPayload}.${sign(encodedPayload, secret).toString("base64url")}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  now = Date.now(),
): boolean {
  const secret = sessionSecret();
  if (!secret || !token || token.length > 2048) return false;

  const separator = token.indexOf(".");
  if (separator <= 0 || separator !== token.lastIndexOf(".")) return false;

  const encodedPayload = token.slice(0, separator);
  const encodedSignature = token.slice(separator + 1);
  const expectedSignature = sign(encodedPayload, secret);
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return false;
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return false;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return false;
  }
  if (!isAdminSessionPayload(payload)) return false;

  const currentTime = Math.floor(now / 1000);
  return (
    payload.issuedAt <= currentTime + 60 &&
    payload.expiresAt > currentTime &&
    payload.expiresAt - payload.issuedAt === ADMIN_SESSION_MAX_AGE
  );
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE,
};

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload, "utf8").digest();
}

function isAdminSessionPayload(value: unknown): value is AdminSessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AdminSessionPayload>;
  return (
    payload.version === 1 &&
    payload.subject === "lampman-admin" &&
    Number.isInteger(payload.issuedAt) &&
    Number.isInteger(payload.expiresAt)
  );
}
