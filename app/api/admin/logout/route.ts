import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
