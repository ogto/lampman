import Link from "next/link";
import { siteConfig } from "@/lib/site";

export default function NotFound() {
  return <main className="not-found"><span>404</span><h1>찾으시는 페이지의 불이 꺼져 있습니다.</h1><p>램프맨 홈에서 필요한 전기수리·전기공사 정보를 다시 찾아보세요.</p><div className="hero-actions"><a className="button button-primary button-phone" href={siteConfig.phoneHref}>{siteConfig.phoneDisplay} 전화 ↗</a><Link className="button button-ghost" href="/">홈으로 돌아가기</Link></div></main>;
}
