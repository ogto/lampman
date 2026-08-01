import Link from "next/link";
import { Brand } from "./Brand";
import { siteConfig } from "@/lib/site";

const navigation = [
  { href: "/daejeon", label: "대전 출동" },
  { href: "/cheongju", label: "청주 출동" },
  { href: "/blog", label: "전기안전 노트" },
];

export function SiteHeader() {
  const contactHref = siteConfig.phoneHref;

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="주요 메뉴">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <a className="header-call" href={contactHref}>
            <span className="live-dot" aria-hidden="true" />
            <small>긴급출동</small>
            <strong>{siteConfig.phoneDisplay}</strong>
          </a>
          <details className="mobile-menu">
            <summary aria-label="메뉴 열기">
              <span />
              <span />
            </summary>
            <nav aria-label="모바일 메뉴">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <a href={contactHref}>긴급출동 {siteConfig.phoneDisplay}</a>
            </nav>
          </details>
        </div>
      </header>
      <a className="emergency-call-dock" href={contactHref} aria-label={`${siteConfig.phoneDisplay} 긴급출동 전화`}>
        <span><i /> 24시간 긴급출동</span>
        <strong>{siteConfig.phoneDisplay}</strong>
      </a>
    </>
  );
}
