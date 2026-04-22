import Link from "next/link";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { ContentService } from "@/modules/content/service";

export const metadata = {
  title: "Blog",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await new ContentService().getBlogPosts();

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">
        Blog <BrandWordmark />
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">
        Consejos para aromatizar espacios, extender la vida de tus velas y crear rituales en casa.
      </p>
      <div className="mt-8 grid gap-4">
        {posts.length ? (
          posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{post.fechaPublicacion}</p>
              <h2 className="mt-2 text-2xl text-[var(--fg-strong)]">{post.titulo}</h2>
              {post.autor.trim() ? <p className="mt-1 text-sm text-[var(--fg-muted)]">Por {post.autor}</p> : null}
              <p className="mt-3 text-[var(--fg-muted)]">{post.extracto}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex rounded-lg border border-[var(--accent-outline)] px-3 py-2 text-sm text-[var(--fg-strong)] hover:bg-[var(--accent-outline)] hover:text-[var(--accent-outline-contrast)]"
              >
                Leer articulo
              </Link>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-[var(--fg-muted)]">
            Aun no hay publicaciones.
          </p>
        )}
      </div>
    </div>
  );
}
