import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "콘텐츠 스튜디오",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
