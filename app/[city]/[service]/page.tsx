import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactBand } from "@/app/_components/ContactBand";
import { JsonLd } from "@/app/_components/JsonLd";
import {
  cityData,
  isCityKey,
  isServiceKey,
  serviceData,
  siteConfig,
} from "@/lib/site";
import { getRequestOrigin } from "@/lib/url";

type Props = { params: Promise<{ city: string; service: string }> };

export function generateStaticParams() {
  return ["daejeon", "cheongju"].flatMap((city) =>
    ["electrical-repair", "electrical-construction"].map((service) => ({ city, service })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, service } = await params;
  if (!isCityKey(city) || !isServiceKey(service)) return {};
  const cityInfo = cityData[city];
  const serviceInfo = serviceData[service];
  const title = `${cityInfo.ko} 24시간 ${serviceInfo.ko}`;
  const description = `${cityInfo.ko} 365일 24시간 ${serviceInfo.ko}. ${serviceInfo.summary} 상담 및 출동 가능 여부를 확인하세요.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city}/${service}` },
    openGraph: { type: "website", title, description, url: `/${city}/${service}`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function ServicePage({ params }: Props) {
  const { city, service } = await params;
  if (!isCityKey(city) || !isServiceKey(service)) notFound();
  const cityInfo = cityData[city];
  const serviceInfo = serviceData[service];
  const origin = await getRequestOrigin();
  const isRepair = service === "electrical-repair";

  const uniqueCopy = isRepair
    ? city === "daejeon"
      ? "공동주택과 상가가 밀집한 대전에서는 한 세대의 문제인지 공용 전원 문제인지 빠르게 구분하는 것이 중요합니다. 유성·둔산 생활권부터 대덕구까지 증상과 회로 범위를 먼저 확인합니다."
      : "청주는 도심 공동주택과 오창·오송 사업장이 함께 있어 정전 범위와 설비 유형을 정확히 알려주는 것이 중요합니다. 생활 전기부터 사업장 분전반 이상까지 현장 조건을 구분합니다."
    : city === "daejeon"
      ? "대전 주거공간의 전용회로 증설부터 상가·연구시설의 분전반과 조명 정비까지 사용 목적과 기존 설비 상태를 함께 살펴 공사 범위를 정합니다."
      : "청주 도심 상가와 오창·오송 사업장의 조명·배선·분전반 공사를 기존 부하와 운영 환경에 맞춰 계획합니다.";

  return (
    <main className="subpage service-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: `${cityInfo.ko} 24시간 ${serviceInfo.ko}`,
        serviceType: serviceInfo.ko,
        description: serviceInfo.summary,
        provider: {
          "@type": "Electrician",
          name: siteConfig.legalName,
          url: origin,
          telephone: siteConfig.phoneE164,
        },
        areaServed: { "@type": "City", name: cityInfo.province },
        url: `${origin}/${city}/${service}`,
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: `${origin}/${city}/${service}`,
          servicePhone: {
            "@type": "ContactPoint",
            telephone: siteConfig.phoneE164,
            contactType: "emergency service",
          },
        },
      }} />

      <section className={`service-hero ${isRepair ? "repair-hero" : "work-hero"}`}>
        <Image src={isRepair ? "/images/breaker-diagnosis.png" : "/images/cafe-lighting-work.png"} alt={`${cityInfo.ko} ${serviceInfo.ko} 서비스`} fill priority sizes="100vw" />
        <div className="service-hero-shade" />
        <div className="shell service-hero-inner">
          <div className="breadcrumbs"><Link href="/">홈</Link><span>/</span><Link href={`/${city}`}>{cityInfo.ko}</Link><span>/</span><b>{serviceInfo.ko}</b></div>
          <p className="eyebrow"><span /> {serviceInfo.eyebrow}</p>
          <h1>{cityInfo.ko} <em>24시간 </em>{serviceInfo.ko}</h1>
          <p>{serviceInfo.summary}</p>
          <a className="button button-primary button-phone" href={siteConfig.phoneHref}>{siteConfig.phoneDisplay} 전화 ↗</a>
        </div>
      </section>

      <section className="service-overview section-pad">
        <div className="shell service-overview-grid">
          <div><p className="eyebrow"><span /> {cityInfo.ko.toUpperCase()} FOCUS</p><h2>보이는 증상보다 <em>원인을 먼저.</em></h2></div>
          <div><p className="large-copy">{uniqueCopy}</p><p>{cityInfo.ko} 24시간 {serviceInfo.ko} 상담은 출동 전 정전 범위와 위험 신호를 확인하고, 현장에서는 작업 전 원인과 범위를 설명하는 흐름으로 진행합니다.</p></div>
        </div>
      </section>

      <section className="issue-section section-pad">
        <div className="shell">
          <div className="section-heading heading-inline"><div><p className="eyebrow"><span /> CHECKLIST</p><h2>이런 문제를 <em>확인합니다.</em></h2></div><p>{cityInfo.districts.join(" · ")} 생활권 상담</p></div>
          <div className="issue-grid">
            {serviceInfo.issues.map((issue, index) => <div key={issue}><span>{String(index + 1).padStart(2, "0")}</span><h3>{issue}</h3><p>증상과 현장 조건을 확인해 필요한 점검 및 작업 범위를 안내합니다.</p></div>)}
          </div>
        </div>
      </section>

      <section className="service-process section-pad">
        <div className="shell service-process-grid">
          <div className="sticky-title"><p className="eyebrow"><span /> PROCESS</p><h2>램프맨의 <em>작업 흐름.</em></h2></div>
          <ol>{serviceInfo.process.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step}</h3><p>{index === 0 ? "급한 상황에서 먼저 해야 할 일과 피해야 할 행동부터 안내합니다." : index === 1 ? "측정과 육안 확인을 통해 증상과 원인의 범위를 좁힙니다." : index === 2 ? "현장 조건에 따라 달라지는 작업 범위와 비용 기준을 설명합니다." : "작업 후 전원과 회로의 동작 상태를 다시 확인합니다."}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="safety-banner">
        <div className="shell"><span>SAFETY FIRST</span><h2>연기·불꽃·강한 탄 냄새가 있다면 설비에 접근하지 말고 대피 후 119에 신고하세요.</h2></div>
      </section>
      <ContactBand />
    </main>
  );
}
