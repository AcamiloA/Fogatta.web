"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
