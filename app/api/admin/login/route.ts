import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { claimRateLimitSlot } from "@/db/blog";
import { safeAdminReturnTo } from "@/lib/admin-auth";
import {
  ADMIN_SESSION_COOKIE,
  adminAuthConfigurationError,
  adminSessionCookieOptions,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return loginRedirect(request, "/admin", "invalid");
  }

  const returnTo = safeAdminReturnTo(String(formData.get("returnTo") ?? ""));
  if (adminAuthConfigurationError()) {
    return loginRedirect(request, returnTo, "config");
  }

  const password = String(formData.get("password") ?? "");
  const clientAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const addressHash = createHash("sha256").update(clientAddress).digest("hex");
  let allowed = false;
  try {
    allowed = await claimRateLimitSlot(
      `admin-login:${addressHash}`,
      20,
      10 * 60 * 1000,
    );
  } catch {
    // Login fails closed if the shared rate-limit store is unavailable.
  }
  if (!allowed) return loginRedirect(request, returnTo, "rate");
  if (!verifyAdminPassword(password)) return loginRedirect(request, returnTo, "invalid");

  const token = createAdminSessionToken();
  if (!token) return loginRedirect(request, returnTo, "config");

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function loginRedirect(request: Request, returnTo: string, error: string) {
  const target = new URL("/admin/login", request.url);
  target.searchParams.set("returnTo", returnTo);
  target.searchParams.set("error", error);
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
