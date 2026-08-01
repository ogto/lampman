import { redirect } from "next/navigation";
import {
  getChatGPTUser,
  requireChatGPTUser,
  type ChatGPTUser,
} from "@/app/chatgpt-auth";

function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isLampmanAdmin(user: ChatGPTUser): boolean {
  const allowed = adminEmailSet();
  return allowed.size > 0 && allowed.has(user.email.toLowerCase());
}

export async function getLampmanAdmin(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  return user && isLampmanAdmin(user) ? user : null;
}

export async function requireLampmanAdmin(returnTo: string): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  if (!isLampmanAdmin(user)) redirect("/admin/forbidden");
  return user;
}
