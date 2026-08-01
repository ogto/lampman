import type { BlogRecord } from "@/db/blog";
import {
  findBlogPostBySlug,
  listPublishedBlogPosts,
} from "@/db/blog";
import { seedPosts } from "@/lib/seed-posts";

export async function getPublishedPosts(): Promise<BlogRecord[]> {
  try {
    const databasePosts = await listPublishedBlogPosts();
    const knownSlugs = new Set(databasePosts.map((post) => post.slug));
    return [
      ...databasePosts,
      ...seedPosts.filter((post) => !knownSlugs.has(post.slug)),
    ].sort((left, right) => {
      const leftDate = left.publishedAt ?? left.createdAt;
      const rightDate = right.publishedAt ?? right.createdAt;
      return rightDate.localeCompare(leftDate);
    });
  } catch {
    return seedPosts;
  }
}

export async function getPublishedPost(
  slug: string,
): Promise<BlogRecord | null> {
  try {
    const databasePost = await findBlogPostBySlug(slug);
    if (databasePost) return databasePost;
  } catch {
    // Seeded guides remain available when D1 is unavailable.
  }
  return seedPosts.find((post) => post.slug === slug) ?? null;
}

export function postImageUrl(post: BlogRecord): string {
  if (!post.imageKey) return "/images/breaker-diagnosis.png";
  if (post.imageKey.startsWith("/")) return post.imageKey;
  return `/media/${post.imageKey}`;
}
