# 램프맨

대전·청주 24시간 전기수리·전기공사를 위한 로컬 SEO 사이트입니다. 지역·서비스 랜딩, 전기안전 블로그, D1/R2 기반 콘텐츠 스튜디오와 사진 분석형 AI 초안 기능을 포함합니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

검증 명령은 다음과 같습니다.

```bash
npm run lint
npx tsc --noEmit --incremental false
npm test
```

## 환경변수

`.env.example`을 참고해 로컬은 `.env.local`, 호스팅 환경은 Sites 환경변수에 등록합니다.

- `OPENAI_API_KEY`: 사진 분석 및 블로그 초안 생성용 서버 키
- `OPENAI_MODEL`: 기본값 `gpt-5.6`
- `ADMIN_EMAILS`: 콘텐츠 스튜디오 접근 허용 이메일. 여러 개면 쉼표로 구분하며 필수입니다.
- `NEXT_PUBLIC_SITE_URL`: 운영 도메인의 절대 URL
- `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_PHONE_DISPLAY`: 실제 24시간 상담 번호와 표시 문구
- `NEXT_PUBLIC_CONTACT_EMAIL`: 고객 문의 이메일

비밀키는 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다.

## 데이터와 미디어

- Cloudflare D1 바인딩 `DB`: 발행/초안 글과 AI 생성 속도 제한 기록
- Cloudflare R2 바인딩 `MEDIA`: 업로드된 블로그 이미지
- Cloudflare Images 바인딩 `IMAGES`: 업로드 이미지를 WebP로 재인코딩해 EXIF를 제거하고 크기를 제한
- Drizzle 스키마: `db/schema.ts`
- 마이그레이션: `drizzle/`

스키마를 바꾸면 아래 명령으로 새 마이그레이션을 생성하고 SQL을 확인합니다.

```bash
npm run db:generate
```

## 콘텐츠 운영

1. `/admin`에서 허용된 ChatGPT 계정으로 로그인합니다.
2. 현장 사진과 최소 메모를 올립니다.
3. AI가 사진에서 확인 가능한 내용만 이용해 제목, 본문, 이미지 설명, SEO 필드를 초안으로 만듭니다.
4. 운영자가 사실관계와 안전 안내를 검수하고 발행합니다.
5. 발행 글은 `/blog/{slug}`와 sitemap/RSS에 자동 반영됩니다.

AI 초안은 자동 공개되지 않습니다. 관리자 allowlist, 시간당 생성 제한, 이미지 형식 검사와 재인코딩이 서버에서 적용됩니다.

## SEO 출시 체크

코드에는 페이지별 title/description/canonical/OG, LocalBusiness·Service·Article JSON-LD, sitemap, robots, RSS, 내부 링크가 포함되어 있습니다. 공개 전 실제 전화번호·주소·사업자 상호를 사이트와 Google Business Profile·네이버 스마트플레이스에 동일하게 등록하고, Google Search Console 및 네이버 서치어드바이저에 sitemap을 제출해야 합니다.

Sites 설정은 `.openai/hosting.json`에 있으며 D1 `DB`, R2 `MEDIA`를 선언합니다. 첫 검수는 비공개 배포로 진행한 뒤 실제 사업 정보와 관리자 환경변수를 연결하고 공개합니다.
