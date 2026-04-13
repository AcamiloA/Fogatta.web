import { AdminInventoryManager } from "@/components/admin/admin-inventory-manager";

export const metadata = {
  title: "Admin Inventario",
};

export default function AdminInventoryPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl text-[var(--fg-strong)]">Inventario</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Administra stock por variante, costos de insumos y capacidad estimada de produccion.
        </p>
      </div>
      <AdminInventoryManager />
    </section>
  );
}
