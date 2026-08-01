# 램프맨

대전·청주 24시간 전기수리·전기공사를 위한 로컬 SEO 사이트입니다. 지역·서비스 랜딩, 전기안전 블로그, Neon/Vercel Blob 기반 콘텐츠 스튜디오와 사진 분석형 AI 초안 기능을 포함합니다.

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

`.env.example`을 참고해 로컬은 `.env.local`, 운영 값은 Vercel 프로젝트 환경변수에 등록합니다.

- `DATABASE_URL`: Neon Postgres 연결 주소
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob 쓰기 토큰
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`: 콘텐츠 스튜디오 로그인과 서명 쿠키용 비밀값
- `AI_MODEL`: AI Gateway 모델. 기본값 `openai/gpt-5.6-terra`
- `NEXT_PUBLIC_SITE_URL`: 운영 도메인의 절대 URL
- `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_PHONE_DISPLAY`: 실제 24시간 상담 번호와 표시 문구

Vercel 배포에서는 짧게 만료되는 `VERCEL_OIDC_TOKEN`이 자동 주입되어 AI Gateway를 사용합니다. 별도 운영 키가 필요한 경우에만 `AI_GATEWAY_API_KEY` 또는 `OPENAI_API_KEY`를 설정합니다.

비밀키는 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다.

## 데이터와 미디어

- Neon Postgres: 발행/초안 글과 AI 생성 속도 제한 기록
- Vercel Blob: 업로드된 공개 블로그 이미지
- 브라우저와 서버의 이중 WebP 재인코딩: EXIF 제거, 최대 크기 및 해상도 제한
- Drizzle 스키마: `db/schema.ts`
- 마이그레이션: `drizzle/`

스키마를 바꾸면 아래 명령으로 새 마이그레이션을 생성하고 SQL을 확인합니다.

```bash
npm run db:generate
npm run db:migrate
```

## 콘텐츠 운영

1. `/admin`에서 운영 비밀번호로 로그인합니다.
2. 현장 사진과 최소 메모를 올립니다.
3. AI가 사진에서 확인 가능한 내용만 이용해 제목, 본문, 이미지 설명, SEO 필드를 초안으로 만듭니다.
4. 운영자가 사실관계와 안전 안내를 검수하고 발행합니다.
5. 발행 글은 `/blog/{slug}`와 sitemap/RSS에 자동 반영됩니다.

AI 초안은 자동 공개되지 않습니다. 서명된 관리자 세션, 시간당 생성 제한, 이미지 형식 검사와 재인코딩이 적용됩니다.

## SEO 출시 체크

코드에는 페이지별 title/description/canonical/OG, LocalBusiness·Service·Article JSON-LD, sitemap, robots, RSS, 내부 링크가 포함되어 있습니다. 공개 전 실제 전화번호·주소·사업자 상호를 사이트와 Google Business Profile·네이버 스마트플레이스에 동일하게 등록하고, Google Search Console 및 네이버 서치어드바이저에 sitemap을 제출해야 합니다.

운영 배포는 Vercel 프로젝트에 연결되어 있습니다. 공개 전 커스텀 도메인을 지정하고 `NEXT_PUBLIC_SITE_URL`, 검색엔진 인증값, sitemap 등록 상태를 최종 확인합니다.
