import { siteConfig } from "@/lib/site";

export function ContactBand() {
  const contactHref = siteConfig.phoneHref;
  return (
    <section className="contact-band" id="contact">
      <div className="contact-orb" aria-hidden="true" />
      <div className="shell contact-band-inner">
        <div className="contact-heading">
          <p className="eyebrow eyebrow-dark"><span /> 24H EMERGENCY CALL</p>
          <h2>지금 전기 문제를 그대로 알려주세요.</h2>
        </div>
        <div className="contact-copy">
          <p>
            집 전체인지 일부 공간인지, 차단기가 언제 내려갔는지, 탄 냄새나
            소리가 있는지만 알려주셔도 출동 준비에 도움이 됩니다.
          </p>
          <a className="contact-link" href={contactHref}>
            <span>24시간 바로 전화</span>
            <strong>{siteConfig.phoneDisplay}</strong>
            <b aria-hidden="true">↗</b>
          </a>
        </div>
      </div>
    </section>
  );
}
