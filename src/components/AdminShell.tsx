"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { hasPermission, isAdminRole, PERMISSIONS } from "@/lib/permissions";
import { BRAND } from "@/lib/brand";

const NAV = [
  { href: "/admin/users", label: "Usuarios", permission: PERMISSIONS.USERS_MANAGE },
  { href: "/admin/ads", label: "Publicidad", permission: PERMISSIONS.ADS_MANAGE },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user?.role;
  const permissions = data?.user?.permissions ?? [];

  const links = NAV.filter((item) => hasPermission(role, permissions, item.permission));

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link">
            ← {BRAND.name}
          </Link>
          <h1>Administración</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-role-badge">
            {role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
          </span>
          <button type="button" className="btn-ghost sm" onClick={() => void signOut()}>
            Salir
          </button>
        </div>
      </header>

      {links.length > 1 ? (
        <nav className="admin-nav" aria-label="Secciones de admin">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "admin-nav-link active" : "admin-nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <main className="admin-main">{children}</main>
    </div>
  );
}

export function useAdminAccess() {
  const { data, status } = useSession();
  const role = data?.user?.role;
  return {
    loading: status === "loading",
    isAdmin: isAdminRole(role),
    role,
    permissions: data?.user?.permissions ?? [],
  };
}
