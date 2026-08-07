import type { Metadata, Viewport } from "next";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";
import { siteAssets } from "@/lib/site";
import { getRequestOrigin } from "@/lib/url";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getRequestOrigin();
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION ?? "";
  const naverVerification = process.env.NAVER_SITE_VERIFICATION ?? "";
  return {
    metadataBase: new URL(origin),
    title: {
      default: "램프맨 | 대전·청주 24시간 전기수리·전기공사",
      template: "%s | 램프맨",
    },
    description:
      "대전·청주 365일 24시간 전기수리·전기공사. 누전, 정전, 차단기, 분전반과 배선 문제를 빠르게 확인합니다.",
    keywords: [
      "대전 전기수리",
      "대전 전기공사",
      "청주 전기수리",
      "청주 전기공사",
      "24시간 전기출동",
      "누전수리",
    ],
    applicationName: "램프맨",
    authors: [{ name: "램프맨" }],
    creator: "램프맨",
    publisher: "램프맨",
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: new URL(siteAssets.icon, origin), type: "image/png", sizes: "512x512" }],
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "램프맨",
      title: "램프맨 | 대전·청주 24시간 전기출동",
      description: "불이 꺼진 순간, 램프맨은 켜집니다.",
      url: origin,
      images: [{ url: siteAssets.defaultOpenGraphImage, width: 1731, height: 909, alt: "램프맨 대전·청주 24시간 전기출동" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "램프맨 | 대전·청주 24시간 전기출동",
      description: "불이 꺼진 순간, 램프맨은 켜집니다.",
      images: [siteAssets.defaultOpenGraphImage],
    },
    verification: {
      ...(googleVerification ? { google: googleVerification } : {}),
      ...(naverVerification
        ? { other: { "naver-site-verification": naverVerification } }
        : {}),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11120f",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">본문 바로가기</a>
        <SiteHeader />
        <div id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
