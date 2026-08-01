import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export type LampmanAdminUser = {
  userId: "lampman-admin";
  displayName: string;
  email: string;
  fullName: string;
};

const ADMIN_USER_MARKER = Symbol("authenticated-lampman-admin");
const ADMIN_USER = Object.freeze({
  userId: "lampman-admin" as const,
  displayName: "램프맨 관리자",
  email: "admin@lampman.local",
  fullName: "램프맨 관리자",
  [ADMIN_USER_MARKER]: true,
});

export function isLampmanAdmin(user: unknown): user is LampmanAdminUser {
  return (
    typeof user === "object" &&
    user !== null &&
    (user as { [ADMIN_USER_MARKER]?: unknown })[ADMIN_USER_MARKER] === true
  );
}

export async function getLampmanAdmin(): Promise<LampmanAdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token) ? ADMIN_USER : null;
}

export async function requireLampmanAdmin(
  returnTo: string,
): Promise<LampmanAdminUser> {
  const user = await getLampmanAdmin();
  if (user) return user;

  const safeReturnTo = safeAdminReturnTo(returnTo);
  redirect(`/admin/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
}

export function safeAdminReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/admin";

  let url: URL;
  try {
    url = new URL(value, "https://lampman.local");
  } catch {
    return "/admin";
  }
  if (
    url.origin !== "https://lampman.local" ||
    (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) ||
    url.pathname === "/admin/login"
  ) {
    return "/admin";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
