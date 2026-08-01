import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><span>404 / LIGHTS OUT</span><h1>찾으시는 페이지의<br />불이 꺼져 있습니다.</h1><p>램프맨 홈에서 필요한 전기수리·전기공사 정보를 다시 찾아보세요.</p><Link className="button button-primary" href="/">홈으로 돌아가기 ↗</Link></main>;
}
