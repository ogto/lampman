import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-empty">
          관리자 로그인이 필요합니다.
          <br />
          등록된 관리자 비밀번호로 콘텐츠 스튜디오에 로그인해 주세요.
          <br />
          <Link href="/admin/login">관리자 로그인</Link>
        </div>
      </section>
    </main>
  );
}
