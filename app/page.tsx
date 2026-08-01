import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactBand } from "./_components/ContactBand";
import { HeroScene } from "./_components/HeroScene";
import { JsonLd } from "./_components/JsonLd";
import { PostCard } from "./_components/PostCard";
import { getPublishedPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";
import { getRequestOrigin } from "@/lib/url";

export const metadata: Metadata = {
  title: "대전·청주 24시간 전기수리·전기공사",
  description:
    "대전·청주 365일 24시간 전기출동. 누전수리, 차단기, 정전, 분전반, 배선과 상가·주택 전기공사를 상담하세요.",
  alternates: { canonical: "/" },
};

const services = [
  {
    number: "01",
    title: "누전·차단기",
    copy: "반복 작동과 원인 불명의 정전을 회로별로 확인합니다.",
    href: "/daejeon/electrical-repair",
  },
  {
    number: "02",
    title: "콘센트·스위치",
    copy: "발열, 변색, 접촉 불량과 필요한 위치의 증설을 살핍니다.",
    href: "/cheongju/electrical-repair",
  },
  {
    number: "03",
    title: "분전반·배선",
    copy: "노후 상태와 사용 부하를 확인하고 필요한 범위를 안내합니다.",
    href: "/daejeon/electrical-construction",
  },
  {
    number: "04",
    title: "상가·공간조명",
    copy: "전기 조건과 공간의 목적을 함께 고려해 조명을 구성합니다.",
    href: "/cheongju/electrical-construction",
  },
];

const faqs = [
  ["밤이나 공휴일에도 출동하나요?", "네. 램프맨은 대전과 청주를 대상으로 365일 24시간 상담과 긴급출동을 운영합니다."],
  ["차단기가 계속 내려가면 직접 올려도 되나요?", "즉시 다시 내려가거나 탄 냄새·열감·소리가 있다면 반복 조작하지 마세요. 안전한 곳에서 증상을 알려주시면 확인 순서를 안내합니다."],
  ["수리비는 전화로 확정할 수 있나요?", "같은 증상도 원인과 현장 조건이 달라 전화만으로 확정하기 어렵습니다. 현장 확인 후 작업 범위와 비용을 먼저 설명하는 흐름으로 설계했습니다."],
  ["대전과 청주 어디까지 가능한가요?", "대전 5개 구와 청주 4개 구, 오창·오송 생활권을 기본 서비스 지역으로 안내합니다. 실제 거리와 현장 상황은 상담 시 확인합니다."],
];

export default async function Home() {
  const [posts, origin] = await Promise.all([
    getPublishedPosts(),
    getRequestOrigin(),
  ]);

  const businessSchema = {
    "@context": "https://schema.org",
    "@type": ["Electrician", "LocalBusiness"],
    name: siteConfig.legalName,
    url: origin,
    description: "대전·청주 365일 24시간 전기수리·전기공사 서비스",
    openingHours: "Mo-Su 00:00-23:59",
    areaServed: [
      { "@type": "City", name: "대전광역시" },
      { "@type": "City", name: "청주시" },
    ],
    knowsAbout: ["전기수리", "전기공사", "누전수리", "차단기", "분전반", "배선공사"],
    telephone: siteConfig.phoneE164,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.phoneE164,
      contactType: "emergency service",
      availableLanguage: "Korean",
      areaServed: ["대전광역시", "청주시"],
    },
    ...(siteConfig.email ? { email: siteConfig.email } : {}),
    ...(siteConfig.address
      ? { address: { "@type": "PostalAddress", streetAddress: siteConfig.address, addressCountry: "KR" } }
      : {}),
    ...(siteConfig.profiles.length ? { sameAs: siteConfig.profiles } : {}),
  };

  return (
    <>
      <JsonLd data={businessSchema} />
      <HeroScene />

      <main>
        <section className="service-intro section-pad">
          <div className="shell">
            <div className="section-heading heading-split">
              <div>
                <h2>전기 문제는 <em>원인부터 다릅니다.</em></h2>
              </div>
              <p>
                보이는 증상만 바꾸는 대신, 어느 회로에서 왜 문제가 생겼는지
                확인하는 것부터 시작합니다. 필요한 작업과 불필요한 작업을
                구분할 수 있어야 제대로 된 수리입니다.
              </p>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <Link className="service-card" href={service.href} key={service.number}>
                  <span className="service-number">{service.number}</span>
                  <div className="service-glyph" aria-hidden="true"><span /></div>
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                  <b>자세히 보기 <span>↗</span></b>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="proof-section section-pad">
          <div className="shell proof-grid">
            <div className="proof-image-wrap">
              <Image
                src="/images/breaker-diagnosis.png"
                alt="전기 기술자가 분전반을 측정 장비로 진단하는 모습"
                width={1448}
                height={1086}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
              <div className="proof-image-label">
                <strong>측정하고, 설명하고, 작업합니다.</strong>
              </div>
            </div>
            <div className="proof-copy">
              <h2>빠른 출동보다 중요한 건 <em>안전한 판단입니다.</em></h2>
              <p className="large-copy">
                긴급한 순간일수록 무엇을 왜 수리하는지 알 수 있어야 합니다.
                램프맨은 증상 확인부터 재측정까지 이해하기 쉬운 흐름을 지향합니다.
              </p>
              <ol className="proof-list">
                <li><span>01</span><div><strong>증상 분리</strong><p>전체 정전인지, 특정 회로 문제인지 먼저 구분합니다.</p></div></li>
                <li><span>02</span><div><strong>작업 전 안내</strong><p>원인과 작업 범위, 비용 기준을 이해하기 쉽게 설명합니다.</p></div></li>
                <li><span>03</span><div><strong>작업 후 확인</strong><p>복구 여부만이 아니라 측정값과 동작 상태를 다시 봅니다.</p></div></li>
              </ol>
            </div>
          </div>
        </section>

        <section className="area-section section-pad" id="areas">
          <div className="shell">
            <div className="section-heading heading-inline">
              <div>
                <h2>두 도시만, <em>더 깊고 빠르게.</em></h2>
              </div>
              <p>전국을 넓게 말하지 않습니다. 실제로 움직일 수 있는 대전과 청주 생활권에 집중합니다.</p>
            </div>
            <div className="area-grid">
              <Link href="/daejeon" className="area-card area-card-dark">
                <div><h3>대전</h3><p>유성구 · 서구 · 중구 · 동구 · 대덕구</p></div>
                <span className="area-link">대전 출동 안내 ↗</span>
              </Link>
              <Link href="/cheongju" className="area-card area-card-light">
                <div><h3>청주</h3><p>흥덕구 · 상당구 · 청원구 · 서원구 · 오창 · 오송</p></div>
                <span className="area-link">청주 출동 안내 ↗</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="work-section section-pad">
          <div className="shell work-grid">
            <div className="work-copy">
              <h2>고치는 기술에서, <em>공간을 켜는 감각까지.</em></h2>
              <p>
                상가와 주택의 조명은 밝기만의 문제가 아닙니다. 기존 회로와
                사용 목적, 눈부심과 유지관리까지 함께 살펴야 오래 편안합니다.
              </p>
              <Link className="text-link" href="/cheongju/electrical-construction">상가·조명공사 알아보기 <span>↗</span></Link>
            </div>
            <div className="work-image-wrap">
              <Image src="/images/cafe-lighting-work.png" alt="카페에서 펜던트 조명을 점검하는 전기 기술자" width={1536} height={1024} sizes="(max-width: 900px) 100vw, 58vw" />
              <div className="light-pulse" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="process-section section-pad" id="process">
          <div className="shell">
            <div className="section-heading heading-inline">
              <div><h2>전화 한 통부터 <em>복구 확인까지.</em></h2></div>
              <p>급할수록 흐름은 단순하고 투명해야 합니다.</p>
            </div>
            <ol className="process-line">
              {[
                ["01", "증상 접수", "정전 범위와 위험 신호를 먼저 확인합니다."],
                ["02", "출동 안내", "지역과 현장 상황을 확인해 방문 흐름을 안내합니다."],
                ["03", "현장 진단", "회로와 설비 상태를 측정해 원인을 좁힙니다."],
                ["04", "작업·확인", "범위 협의 후 작업하고 안전 상태를 다시 확인합니다."],
              ].map(([number, title, copy]) => (
                <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="journal-section section-pad">
          <div className="shell">
            <div className="section-heading heading-inline">
              <div><h2>전기안전 <em>노트.</em></h2></div>
              <Link className="text-link" href="/blog">모든 글 보기 <span>↗</span></Link>
            </div>
            <div className="journal-grid">
              {posts.slice(0, 3).map((post, index) => <PostCard post={post} featured={index === 0} key={post.slug} />)}
            </div>
          </div>
        </section>

        <section className="faq-section section-pad">
          <div className="shell faq-grid">
            <div className="faq-heading">
              <h2>급할 때 가장 <em>많이 묻는 것.</em></h2>
              <a className="faq-call" href={siteConfig.phoneHref}>바로 전화 {siteConfig.phoneDisplay} ↗</a>
            </div>
            <div className="faq-list">
              {faqs.map(([question, answer], index) => (
                <details key={question} open={index === 0}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<b>＋</b></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <ContactBand />
      </main>
    </>
  );
}
