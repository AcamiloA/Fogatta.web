import { ContactForm } from "@/components/forms/contact-form";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Contacto",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 md:grid-cols-2">
      <section>
        <h1 className="text-4xl text-[var(--fg-strong)]">Contacto</h1>
        <p className="mt-4 text-[var(--fg-muted)]">
          Cuéntanos qué aroma o formato estás buscando y te respondemos los antes posible.
        </p>
        <div className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-5">
          <p className="text-sm text-[var(--fg-muted)]">Horario de atención</p>
          <p className="font-medium text-[var(--fg-strong)]">{siteConfig.supportHours}</p>
        </div>
      </section>
      <section>
        <ContactForm />
      </section>
    </div>
  );
}
