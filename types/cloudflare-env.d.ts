interface CloudflareEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
}

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}
