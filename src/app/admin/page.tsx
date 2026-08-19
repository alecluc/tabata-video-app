import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, isAdminRole, PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Administración" };
export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const session = await auth();
  const role = session?.user?.role;
  const permissions = session?.user?.permissions ?? [];

  if (!session?.user || !isAdminRole(role)) {
    redirect("/");
  }

  if (hasPermission(role, permissions, PERMISSIONS.USERS_MANAGE)) {
    redirect("/admin/users");
  }

  if (hasPermission(role, permissions, PERMISSIONS.ADS_MANAGE)) {
    redirect("/admin/ads");
  }

  redirect("/");
}
