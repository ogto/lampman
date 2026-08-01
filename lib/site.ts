const phoneDigits = (process.env.NEXT_PUBLIC_PHONE ?? "").replace(/\D/g, "") || "01080715580";
const phoneE164 = phoneDigits.startsWith("0") ? `+82${phoneDigits.slice(1)}` : `+${phoneDigits}`;

export const siteConfig = {
  name: "램프맨",
  englishName: "LAMPMAN",
  description:
    "대전·청주 365일 24시간 전기수리·전기공사. 누전, 정전, 차단기, 분전반과 배선 문제를 빠르게 확인합니다.",
  phone: phoneDigits,
  phoneE164,
  phoneHref: `tel:${phoneE164}`,
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY || "010-8071-5580",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  legalName: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "램프맨",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "",
  registrationNumber: process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION ?? "",
  profiles: [
    process.env.NEXT_PUBLIC_NAVER_PLACE_URL ?? "",
    process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL ?? "",
  ].filter(Boolean),
  regions: ["대전", "청주"],
} as const;

export const isBusinessInfoComplete = Boolean(
  siteConfig.phone && siteConfig.address && siteConfig.registrationNumber,
);

export const cityData = {
  daejeon: {
    key: "daejeon",
    ko: "대전",
    province: "대전광역시",
    districts: ["유성구", "서구", "중구", "동구", "대덕구"],
    intro:
      "아파트 밀집 지역부터 연구단지·상가까지, 대전의 주거 및 사업장 환경에 맞춰 전기 이상을 확인합니다.",
    detail:
      "유성구 공동주택, 둔산·탄방 상권, 대덕 산업·연구시설 등 서로 다른 전력 사용 환경을 고려해 증상부터 안전하게 진단합니다.",
  },
  cheongju: {
    key: "cheongju",
    ko: "청주",
    province: "충청북도 청주시",
    districts: ["흥덕구", "상당구", "청원구", "서원구", "오창", "오송"],
    intro:
      "도심 아파트와 오창·오송 사업장까지, 청주 생활권의 거리와 현장 유형을 고려해 출동합니다.",
    detail:
      "가경·복대 주거지역, 상당구 구도심, 오창·오송 상가와 사업장의 다양한 배선 및 분전반 환경을 구분해 점검합니다.",
  },
} as const;

export const serviceData = {
  "electrical-repair": {
    key: "electrical-repair",
    ko: "전기수리",
    summary:
      "갑자기 내려간 차단기, 일부 정전, 콘센트 발열과 조명 이상을 증상별로 확인합니다.",
    issues: ["누전·차단기 작동", "일부 또는 전체 정전", "콘센트·스위치 이상", "조명 깜빡임·점등 불량"],
    process: ["전화로 증상과 안전상태 확인", "현장 회로·절연 상태 진단", "원인과 작업 범위 사전 안내", "수리 후 재측정 및 동작 확인"],
  },
  "electrical-construction": {
    key: "electrical-construction",
    ko: "전기공사",
    summary:
      "주택·상가의 배선, 분전반, 전용회로와 조명 공사를 현장 조건에 맞게 계획합니다.",
    issues: ["분전반·차단기 교체", "콘센트 증설·전용회로", "상가·주택 배선 정비", "LED·공간 조명 설치"],
    process: ["사용 목적과 현장 조건 확인", "부하·배선 상태 점검", "공사 범위와 견적 협의", "시공·정리 후 안전 확인"],
  },
} as const;

export type CityKey = keyof typeof cityData;
export type ServiceKey = keyof typeof serviceData;

export function isCityKey(value: string): value is CityKey {
  return value in cityData;
}

export function isServiceKey(value: string): value is ServiceKey {
  return value in serviceData;
}
