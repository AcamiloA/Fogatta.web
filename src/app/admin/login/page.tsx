import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated } from "@/modules/admin/session";

export const metadata = {
  title: "Admin Login",
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16">
      <AdminLoginForm />
    </div>
  );
}
