import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BlogComments } from "@/components/blog/blog-comments";
import { BlogCommentsService } from "@/modules/blog/comments-service";
import { ContentService } from "@/modules/content/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await new ContentService().getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Articulo",
      alternates: {
        canonical: `/blog/${slug}`,
      },
    };
  }

  return {
    title: post.titulo,
    description: post.extracto?.trim() || `Articulo de FOGATTA sobre velas aromaticas: ${post.titulo}.`,
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, comments] = await Promise.all([
    new ContentService().getBlogPostBySlug(slug),
    new BlogCommentsService().listByPostSlug(slug),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-10">
      <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{post.fechaPublicacion}</p>
      <h1 className="mt-2 text-4xl text-[var(--fg-strong)]">{post.titulo}</h1>
      <p className="mt-4 whitespace-pre-line text-lg text-[var(--fg-muted)]">{post.extracto}</p>
      <div className="mt-8 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-6">
        <p className="whitespace-pre-line leading-8 text-[var(--fg-muted)]">{post.contenido}</p>
        <p className="mt-6 text-left text-sm text-[var(--fg-soft)]">Escrito por: {post.autor}</p>
      </div>
      <BlogComments slug={slug} initialComments={comments} />
    </article>
  );
}
