import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactBand } from "@/app/_components/ContactBand";
import { JsonLd } from "@/app/_components/JsonLd";
import { cityData, isCityKey, siteConfig } from "@/lib/site";
import { getRequestOrigin } from "@/lib/url";

type Props = { params: Promise<{ city: string }> };

export function generateStaticParams() {
  return [{ city: "daejeon" }, { city: "cheongju" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  if (!isCityKey(city)) return {};
  const data = cityData[city];
  const title = `${data.ko} 24시간 전기수리·전기공사`;
  const description = `${data.province} 365일 24시간 전기출동. 누전, 정전, 차단기, 분전반, 배선과 주택·상가 전기공사를 상담하세요.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city}` },
    openGraph: { type: "website", title, description, url: `/${city}`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;
  if (!isCityKey(city)) notFound();
  const data = cityData[city];
  const origin = await getRequestOrigin();
  const isDaejeon = city === "daejeon";

  return (
    <main className="subpage">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: `${data.ko} 24시간 전기수리·전기공사`,
          serviceType: "전기수리 및 전기공사",
          provider: {
            "@type": "Electrician",
            name: siteConfig.legalName,
            url: origin,
            telephone: siteConfig.phoneE164,
          },
          areaServed: { "@type": "City", name: data.province },
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: `${origin}/${city}`,
            servicePhone: {
              "@type": "ContactPoint",
              telephone: siteConfig.phoneE164,
              contactType: "emergency service",
            },
          },
        }}
      />
      <section className="sub-hero city-hero">
        <div className="shell sub-hero-grid">
          <div>
            <div className="breadcrumbs"><Link href="/">홈</Link><span>/</span><b>{data.ko}</b></div>
            <h1>{data.ko}의 밤을 <em>다시 밝히는 일.</em></h1>
            <p className="sub-lead">{data.intro}</p>
            <div className="hero-actions">
              <a className="button button-primary button-phone" href={siteConfig.phoneHref}>{siteConfig.phoneDisplay} 전화 ↗</a>
              <Link className="button button-ghost" href={`/${city}/electrical-repair`}>24시 전기수리</Link>
              <Link className="button button-ghost" href={`/${city}/electrical-construction`}>전기공사</Link>
            </div>
          </div>
          <div className="city-visual">
            <Image
              src={isDaejeon ? "/images/breaker-diagnosis.png" : "/images/cafe-lighting-work.png"}
              alt={`${data.ko} 전기수리와 전기공사 서비스 이미지`}
              width={isDaejeon ? 1448 : 1536}
              height={isDaejeon ? 1086 : 1024}
              sizes="(max-width: 900px) 100vw, 48vw"
            />
            <div className="city-visual-tag"><strong>{data.ko} 전 지역</strong></div>
          </div>
        </div>
      </section>

      <section className="city-detail section-pad">
        <div className="shell city-detail-grid">
          <div><h2>지역명만 바꾼 <em>서비스가 아닙니다.</em></h2></div>
          <div>
            <p className="large-copy">{data.detail}</p>
            <div className="district-list">
              {data.districts.map((district, index) => <span key={district}><b>{String(index + 1).padStart(2, "0")}</b>{district}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="city-service-section section-pad">
        <div className="shell city-services">
          <Link href={`/${city}/electrical-repair`} className="city-service-card city-service-repair">
            <h2>{data.ko} 24시간 전기수리</h2><p>누전·정전·차단기·콘센트처럼 갑자기 생긴 생활 전기 이상을 확인합니다.</p><b>서비스 자세히 보기 ↗</b>
          </Link>
          <Link href={`/${city}/electrical-construction`} className="city-service-card city-service-work">
            <h2>{data.ko} 전기공사</h2><p>분전반·배선·전용회로·조명처럼 계획과 시공이 필요한 작업을 안내합니다.</p><b>서비스 자세히 보기 ↗</b>
          </Link>
        </div>
      </section>

      <section className="local-note section-pad">
        <div className="shell local-note-inner">
          <span className="giant-quote" aria-hidden="true">“</span>
          <p>출동 가능 여부는 주소 한 줄보다 현장의 안전 상태가 먼저입니다.</p>
          <small>연기·불꽃이 보이면 전기설비에 접근하지 말고 즉시 대피 후 119에 신고하세요.</small>
        </div>
      </section>
      <ContactBand />
    </main>
  );
}
