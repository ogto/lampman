import Link from "next/link";
import { Brand } from "./Brand";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Brand />
          <p className="footer-lead">
            불이 꺼진 순간에도, 필요한 곳에 다시 빛이 돌아오도록.
          </p>
        </div>
        <div>
          <strong>서비스</strong>
          <Link href="/daejeon/electrical-repair">대전 전기수리</Link>
          <Link href="/daejeon/electrical-construction">대전 전기공사</Link>
          <Link href="/cheongju/electrical-repair">청주 전기수리</Link>
          <Link href="/cheongju/electrical-construction">청주 전기공사</Link>
        </div>
        <div>
          <strong>안내</strong>
          <Link href="/blog">전기안전 노트</Link>
          <Link href="/#process">출동 절차</Link>
          <a href={siteConfig.phoneHref}>24시간 긴급전화</a>
          <Link href="/admin" rel="nofollow">
            관리자
          </Link>
        </div>
        <div className="footer-contact">
          <strong>대전 · 청주</strong>
          <p>365일 24시간 긴급 전기출동</p>
          <a className="footer-phone" href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a>
          {siteConfig.email && <p>{siteConfig.email}</p>}
          {siteConfig.address && <p>{siteConfig.address}</p>}
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} 램프맨</span>
      </div>
    </footer>
  );
}
