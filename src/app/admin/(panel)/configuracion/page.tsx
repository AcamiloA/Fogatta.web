export const metadata = {
  title: "Admin Configuracion",
};

export default function AdminSettingsPage() {
  return (
    <section className="rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
      <h2 className="text-2xl text-[var(--fg-strong)]">Configuracion</h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Aqui iremos agregando parametros globales, reglas e integraciones del negocio.
      </p>
    </section>
  );
}
