import { redirect } from "next/navigation";
import { getLampmanAdmin, safeAdminReturnTo } from "@/lib/admin-auth";
import { adminAuthConfigurationError } from "@/lib/admin-session";

type Props = {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const returnTo = safeAdminReturnTo(query.returnTo);
  if (await getLampmanAdmin()) redirect(returnTo);

  const configurationError = adminAuthConfigurationError();
  const errorMessage =
    query.error === "invalid"
      ? "비밀번호가 올바르지 않습니다."
      : query.error === "rate"
        ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요."
        : query.error === "config"
        ? configurationError ?? "관리자 인증 설정을 확인해 주세요."
        : configurationError;

  return (
    <main className="admin-page">
      <section className="admin-shell" style={{ maxWidth: 560 }}>
        <header className="editor-header">
          <div><span>램프맨 콘텐츠 스튜디오</span></div>
          <h1>관리자 로그인</h1>
        </header>

        <div className="editor-main" style={{ marginTop: 40 }}>
          <form className="editor-form" action="/api/admin/login" method="post">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label>
              <span>관리자 비밀번호</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                autoFocus
                required
              />
            </label>
            {errorMessage && (
              <p className="admin-error" role="alert">{errorMessage}</p>
            )}
            <button className="admin-save" type="submit" disabled={Boolean(configurationError)}>
              로그인
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
