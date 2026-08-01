import Link from "next/link";
import { Brand } from "./Brand";
import { siteConfig } from "@/lib/site";

const navigation = [
  { href: "/daejeon", label: "대전 출동" },
  { href: "/cheongju", label: "청주 출동" },
  { href: "/blog", label: "전기안전 노트" },
];

export function SiteHeader() {
  const contactHref = siteConfig.phone ? `tel:${siteConfig.phone}` : "/#contact";

  return (
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
        <Link className="header-call" href={contactHref}>
          <span className="live-dot" aria-hidden="true" />
          {siteConfig.phoneDisplay}
        </Link>
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
            <Link href={contactHref}>{siteConfig.phoneDisplay}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
