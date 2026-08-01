"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLampmanAdmin } from "@/lib/admin-auth";
import {
  findAnyBlogPostBySlug,
  findBlogPostById,
  publishBlogPost,
  unpublishBlogPost,
  updateBlogPost,
} from "@/db/blog";
import { seedPosts } from "@/lib/seed-posts";

function value(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

async function assertAdmin() {
  const user = await getLampmanAdmin();
  if (!user) throw new Error("관리자 권한이 필요합니다.");
}

export async function savePostAction(formData: FormData) {
  await assertAdmin();
  const id = value(formData, "id");
  const slug = value(formData, "slug");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("URL 슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }
  const [current, duplicate] = await Promise.all([
    findBlogPostById(id),
    findAnyBlogPostBySlug(slug),
  ]);
  if (!current) throw new Error("수정할 초안을 찾지 못했습니다.");
  if ((duplicate && duplicate.id !== id) || seedPosts.some((post) => post.slug === slug)) {
    throw new Error("이미 사용 중인 URL 슬러그입니다.");
  }
  await updateBlogPost(id, {
    slug,
    title: value(formData, "title"),
    excerpt: value(formData, "excerpt"),
    content: value(formData, "content"),
    city: value(formData, "city"),
    service: value(formData, "service"),
    imageAlt: value(formData, "imageAlt"),
    seoTitle: value(formData, "seoTitle"),
    seoDescription: value(formData, "seoDescription"),
  });
  revalidatePath("/blog");
  revalidatePath(`/blog/${current.slug}`);
  revalidatePath(`/blog/${slug}`);
  revalidatePath(`/admin/posts/${id}`);
  redirect(`/admin/posts/${id}?saved=1`);
}

export async function publishPostAction(formData: FormData) {
  await assertAdmin();
  const id = value(formData, "id");
  await publishBlogPost(id);
  const post = await findBlogPostById(id);
  revalidatePath("/blog");
  if (post) revalidatePath(`/blog/${post.slug}`);
  redirect(post ? `/blog/${post.slug}` : "/blog");
}

export async function unpublishPostAction(formData: FormData) {
  await assertAdmin();
  const id = value(formData, "id");
  const post = await findBlogPostById(id);
  if (!post) throw new Error("공개를 중지할 글을 찾지 못했습니다.");
  await unpublishBlogPost(id);
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath(`/admin/posts/${id}`);
  redirect(`/admin/posts/${id}?unpublished=1`);
}
