"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/lib/site";

export function HeroScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const contactHref = siteConfig.phoneHref;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      section.style.setProperty("--hero-progress", progress.toFixed(4));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="hero hero-scroll" ref={sectionRef}>
      <div className="hero-sticky">
        <Image
          className="hero-image hero-image-night"
          src="/images/lampman-hero.png"
          alt="야간에 아파트 분전반을 점검하는 전기 기술자"
          fill
          priority
          sizes="100vw"
        />
        <Image
          className="hero-image hero-image-light"
          src="/images/lampman-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          aria-hidden="true"
        />
        <div className="hero-shade" />
        <div className="hero-light-beam" aria-hidden="true" />
        <div className="hero-voltage-line" aria-hidden="true"><span /></div>

        <div className="shell hero-content">
          <div className="hero-copy">
            <p className="eyebrow"><span /> DAEJEON · CHEONGJU / 24 HOURS</p>
            <h1>
              <span>불이 꺼진 순간,</span>
              <em>램프맨은 켜집니다.</em>
            </h1>
            <p className="hero-description">
              대전·청주 365일 24시간 전기수리와 전기공사. 누전·정전·차단기
              이상부터 배선과 분전반까지 빠르게 확인합니다.
            </p>
            <div className="hero-actions">
              <a className="button button-primary hero-phone" href={contactHref}>
                <span>24시간 긴급출동</span>
                <strong>{siteConfig.phoneDisplay}</strong>
              </a>
              <a className="button button-ghost" href="#areas">
                출동 가능 지역 <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>

        <a className="hero-call-rail" href={contactHref} aria-label={`${siteConfig.phoneDisplay} 긴급출동 전화`}>
          <span>24H DIRECT CALL</span>
          <strong>{siteConfig.phoneDisplay}</strong>
          <b>전화 연결 ↗</b>
        </a>

        <div className="hero-scroll-cue" aria-hidden="true">
          <span>SCROLL TO LIGHT UP</span>
          <i><b /></i>
        </div>
        <div className="hero-index" aria-hidden="true">01 / LIGHT RESTORED</div>
      </div>
    </section>
  );
}
