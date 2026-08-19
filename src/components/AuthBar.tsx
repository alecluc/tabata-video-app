"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { isAdminRole } from "@/lib/permissions";

export function AuthBar() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <div className="auth-bar" />;
  }

  if (data?.user) {
    return (
      <div className="auth-bar">
        {isAdminRole(data.user.role) ? (
          <Link href="/admin" className="btn-ghost sm">
            Admin
          </Link>
        ) : null}
        <span className="auth-bar-name">{data.user.name || data.user.email}</span>
        <button type="button" className="btn-ghost sm" onClick={() => void signOut()}>
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="auth-bar">
      <Link href="/login" className="btn-ghost sm">
        Entrar
      </Link>
      <Link href="/register" className="btn-primary sm">
        Crear cuenta
      </Link>
    </div>
  );
}
