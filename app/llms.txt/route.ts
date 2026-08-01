import { configuredOrigin } from "@/lib/url";

export function GET() {
  const origin = configuredOrigin();
  return new Response(`# 램프맨\n\n대전·청주 365일 24시간 전기수리·전기공사 서비스입니다.\n\n## 주요 페이지\n- ${origin}/daejeon\n- ${origin}/cheongju\n- ${origin}/blog\n\n## 안내\n전기안전 글은 일반 정보이며, 연기·불꽃·탄 냄새가 있으면 대피 후 119와 전문 기술자에게 연락해야 합니다.\n`, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
