import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const port = 3217;
const baseUrl = `http://127.0.0.1:${port}`;
const decorativeEnglish = /DAEJEON · CHEONGJU|WHAT WE FIX|OUR STANDARD|SERVICE AREA|SPACE & LIGHTING|HOW IT WORKS|FIELD NOTES|24H EMERGENCY CALL|ELECTRIC CARE|DIRECT CALL|SCROLL TO LIGHT UP|LIGHT RESTORED|LOCAL FOCUS|CHECKLIST|SAFETY FIRST|EMERGENCY REPAIR|ELECTRICAL WORK/;
let server;

before(async () => {
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const cli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  server = spawn(process.execPath, [cli, "preview", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: projectRoot,
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: baseUrl },
    stdio: "ignore",
    windowsHide: true,
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`production server exited with ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("production server did not start in time");
});

after(() => {
  if (server && server.exitCode === null) server.kill();
});

test("server-renders the Lampman SEO homepage", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko"/i);
  assert.match(html, /대전·청주 24시간 전기수리·전기공사 \| 램프맨/);
  assert.match(html, /불이 꺼진 순간/);
  assert.match(html, /href="\/daejeon\/electrical-repair"/);
  assert.match(html, /href="\/cheongju\/electrical-construction"/);
  assert.match(html, /href="tel:\+821080715580"/);
  assert.match(html, /010-8071-5580/);
  assert.match(html, /급할 때 가장 <em>많이 묻는 것\.<\/em>/);
  assert.match(html, /지금 전기 문제를 그대로 알려주세요\./);
  assert.doesNotMatch(html, /급할 때 가장<br/);
  assert.doesNotMatch(html, /지금 전기 문제를<br/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, decorativeEnglish);
  assert.doesNotMatch(html, /hero-image-light|hero-image-night/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders a unique regional service page", async () => {
  const response = await fetch(`${baseUrl}/daejeon/electrical-repair`);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /대전 24시간 전기수리/);
  assert.match(html, /누전·차단기/);
  assert.match(html, /전체 정전/);
  assert.match(html, /<h1>대전.*24시간.*전기수리<\/h1>/s);
  assert.doesNotMatch(html, /<h1>대전<br/);
  assert.match(html, /href="tel:\+821080715580"/);
  assert.doesNotMatch(html, decorativeEnglish);
  assert.doesNotMatch(html, /<title>청주 24시간 전기공사/);
});

test("regional and blog hubs omit decorative English labels", async () => {
  for (const path of ["/daejeon", "/cheongju", "/blog"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), decorativeEnglish);
  }
});

test("serves source and optimized brand images", async () => {
  const source = await fetch(`${baseUrl}/images/lampman-hero.png`);
  assert.equal(source.status, 200);
  assert.match(source.headers.get("content-type") ?? "", /^image\/png\b/i);

  const optimized = await fetch(`${baseUrl}/_vinext/image?url=%2Fimages%2Flampman-hero.png&w=640&q=75`);
  assert.equal(optimized.status, 200);
  assert.match(optimized.headers.get("content-type") ?? "", /^image\//i);
});
