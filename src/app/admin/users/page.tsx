"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALL_PERMISSIONS,
  hasPermission,
  PERMISSION_LABELS,
  PERMISSIONS,
  type Permission,
  type UserRole,
} from "@/lib/permissions";
import { AdminShell, useAdminAccess } from "@/components/AdminShell";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Usuario",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { loading, isAdmin, role, permissions } = useAdminAccess();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = hasPermission(role, permissions, PERMISSIONS.USERS_MANAGE);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin || !canManage) {
      router.replace("/");
      return;
    }

    void fetch("/api/admin/users")
      .then(async (res) => {
        if (!res.ok) throw new Error("No pudimos cargar los usuarios");
        const data = (await res.json()) as { users: AdminUser[] };
        setUsers(data.users);
      })
      .catch((err: Error) => setError(err.message));
  }, [loading, isAdmin, canManage, router]);

  async function updateUser(userId: string, patch: { role?: UserRole; permissions?: string[] }) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUser };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data.user! } : u)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusyId(null);
    }
  }

  function togglePermission(user: AdminUser, permission: Permission) {
    const next = user.permissions.includes(permission)
      ? user.permissions.filter((p) => p !== permission)
      : [...user.permissions, permission];
    void updateUser(user.id, { permissions: next });
  }

  if (loading || !isAdmin || !canManage) {
    return <div className="admin-page admin-loading">Cargando…</div>;
  }

  return (
    <AdminShell>
      <section className="admin-panel">
        <div className="section-head">
          <h2>Usuarios y admins</h2>
          <span>{users.length}</span>
        </div>
        <p className="admin-lede">
          Promové cuentas a admin y elegí qué pueden hacer. El super admin tiene todos los permisos.
        </p>
        {error ? <p className="field-error">{error}</p> : null}

        <ul className="admin-user-list">
          {users.map((user) => (
            <li key={user.id} className="admin-user-card">
              <div className="admin-user-head">
                <div>
                  <strong>{user.name || user.email}</strong>
                  <span className="admin-user-email">{user.email}</span>
                </div>
                <select
                  className="admin-select"
                  value={user.role}
                  disabled={busyId === user.id || (user.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN")}
                  onChange={(e) => void updateUser(user.id, { role: e.target.value as UserRole })}
                >
                  {(role === "SUPER_ADMIN"
                    ? (["USER", "ADMIN", "SUPER_ADMIN"] as const)
                    : (["USER", "ADMIN"] as const)
                  ).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              {user.role === "ADMIN" ? (
                <div className="admin-permissions">
                  <span className="admin-permissions-label">Permisos</span>
                  <div className="admin-permission-grid">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label key={permission} className="admin-permission-chip">
                        <input
                          type="checkbox"
                          checked={user.permissions.includes(permission)}
                          disabled={busyId === user.id}
                          onChange={() => togglePermission(user, permission)}
                        />
                        <span>{PERMISSION_LABELS[permission]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
