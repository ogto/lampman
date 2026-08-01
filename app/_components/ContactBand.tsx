import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function ContactBand() {
  const contactHref = siteConfig.phone ? `tel:${siteConfig.phone}` : "/#contact";
  return (
    <section className="contact-band" id="contact">
      <div className="contact-orb" aria-hidden="true" />
      <div className="shell contact-band-inner">
        <div>
          <p className="eyebrow eyebrow-dark"><span /> 24H EMERGENCY CALL</p>
          <h2>지금 전기 문제를<br />그대로 알려주세요.</h2>
        </div>
        <div className="contact-copy">
          <p>
            집 전체인지 일부 공간인지, 차단기가 언제 내려갔는지, 탄 냄새나
            소리가 있는지만 알려주셔도 출동 준비에 도움이 됩니다.
          </p>
          <Link className="contact-link" href={contactHref}>
            <span>{siteConfig.phoneDisplay}</span>
            <b aria-hidden="true">↗</b>
          </Link>
          {!siteConfig.phone && (
            <small>대표번호를 연결하면 이 버튼이 즉시 전화 버튼으로 전환됩니다.</small>
          )}
        </div>
      </div>
    </section>
  );
}
