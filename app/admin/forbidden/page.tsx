import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-empty">
          이 계정에는 램프맨 콘텐츠 스튜디오 권한이 없습니다.
          <br />
          운영자는 사이트 환경변수 <strong>ADMIN_EMAILS</strong>에 허용할 이메일을 등록해야 합니다.
          <br />
          <Link href="/">사이트로 돌아가기</Link>
        </div>
      </section>
    </main>
  );
}
