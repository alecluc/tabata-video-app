import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { ALL_PERMISSIONS, PERMISSIONS, SUPER_ADMIN_EMAIL, type UserRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface PatchBody {
  role?: UserRole;
  permissions?: string[];
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission(PERMISSIONS.USERS_MANAGE);
  if (gate instanceof Response) return gate;

  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL && body.role && body.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "No podés quitar el rol de super admin principal" },
      { status: 400 },
    );
  }

  if (gate.role !== "SUPER_ADMIN" && target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Solo el super admin puede modificar otro super admin" }, { status: 403 });
  }

  const role = body.role ?? target.role;
  if (!["USER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (gate.role !== "SUPER_ADMIN" && role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Solo el super admin puede crear super admins" }, { status: 403 });
  }

  let permissions = body.permissions ?? undefined;
  if (permissions) {
    permissions = permissions.filter((p) => ALL_PERMISSIONS.includes(p as (typeof ALL_PERMISSIONS)[number]));
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role,
      permissions: role === "ADMIN" ? (permissions ?? []) : [],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
    },
  });

  return NextResponse.json({ user: updated });
}
