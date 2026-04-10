import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-24 text-center">
      <h1 className="text-4xl text-[var(--fg-strong)]">No encontramos esa página</h1>
      <p className="mt-4 text-[var(--fg-muted)]">
        Puede que la URL haya cambiado o que el producto aún no esté publicado.
      </p>
      <Link
        href="/catalogo"
        className="mt-8 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-contrast)]"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
