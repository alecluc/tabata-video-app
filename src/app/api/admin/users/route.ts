import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.USERS_MANAGE);
  if (gate instanceof Response) return gate;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
