import { auth } from "@/auth";
import { dbEnabled, prisma } from "@/lib/prisma";
import {
  hasPermission,
  isAdminRole,
  SUPER_ADMIN_EMAIL,
  type Permission,
  type UserRole,
} from "@/lib/permissions";

export interface AdminSession {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email ?? "";
  if (!userId || !email) return null;

  const role = (session.user as { role?: UserRole }).role ?? "USER";
  const permissions = (session.user as { permissions?: string[] }).permissions ?? [];

  if (!isAdminRole(role)) return null;
  return { userId, email, role, permissions };
}

export async function requirePermission(required: Permission): Promise<AdminSession | Response> {
  if (!dbEnabled()) {
    return Response.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!hasPermission(admin.role, admin.permissions, required)) {
    return Response.json({ error: "Permiso insuficiente" }, { status: 403 });
  }

  return admin;
}

export async function ensureBootstrapSuperAdmin(userId: string, email: string | null | undefined) {
  if (!dbEnabled()) return;
  const normalized = email?.trim().toLowerCase();
  if (normalized !== SUPER_ADMIN_EMAIL) return;

  await prisma.user.update({
    where: { id: userId },
    data: { role: "SUPER_ADMIN", permissions: [] },
  });
}

export async function loadUserAuthFields(userId: string) {
  if (!dbEnabled()) {
    return { role: "USER" as UserRole, permissions: [] as string[] };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, permissions: true },
  });

  if (!user) {
    return { role: "USER" as UserRole, permissions: [] as string[] };
  }

  if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL && user.role !== "SUPER_ADMIN") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "SUPER_ADMIN", permissions: [] },
    });
    return { role: "SUPER_ADMIN" as UserRole, permissions: [] as string[] };
  }

  return {
    role: user.role as UserRole,
    permissions: user.permissions,
  };
}
