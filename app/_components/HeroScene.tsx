"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/lib/site";

export function HeroScene() {
  const [lit, setLit] = useState(true);
  const contactHref = siteConfig.phone ? `tel:${siteConfig.phone}` : "#contact";

  return (
    <section className={`hero ${lit ? "hero-lit" : "hero-dim"}`}>
      <Image
        className="hero-image"
        src="/images/lampman-hero.png"
        alt="야간에 아파트 분전반을 점검하는 전기 기술자"
        fill
        priority
        sizes="100vw"
      />
      <div className="hero-shade" />
      <div className="hero-light-beam" aria-hidden="true" />
      <div className="shell hero-content">
        <div className="hero-copy">
          <p className="eyebrow"><span /> DAEJEON · CHEONGJU / 24 HOURS</p>
          <h1>
            불이 꺼진 순간,
            <br />
            <em>램프맨은 켜집니다.</em>
          </h1>
          <p className="hero-description">
            대전·청주 365일 24시간 전기수리와 전기공사.
            <br className="desktop-only" /> 누전·정전·차단기 이상부터 배선과
            분전반까지 빠르게 확인합니다.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href={contactHref}>
              <span className="button-icon" aria-hidden="true">↗</span>
              지금 출동 문의
            </Link>
            <Link className="button button-ghost" href="#areas">
              출동 가능 지역 <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>
        <div className="hero-status-card">
          <button
            className="light-switch"
            type="button"
            aria-pressed={lit}
            onClick={() => setLit((value) => !value)}
          >
            <span className="switch-track"><span /></span>
            <span>{lit ? "조명 켜짐" : "조명 꺼짐"}</span>
          </button>
          <div className="hero-status-divider" />
          <div className="hero-status-row">
            <span>현재 운영</span>
            <strong><span className="live-dot" /> 24시간</strong>
          </div>
          <div className="hero-status-row">
            <span>출동 지역</span>
            <strong>대전 · 청주</strong>
          </div>
        </div>
      </div>
      <div className="hero-index" aria-hidden="true">01 / LIGHT ON</div>
    </section>
  );
}
