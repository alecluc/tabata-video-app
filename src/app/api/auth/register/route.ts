import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbEnabled, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!dbEnabled()) {
    return NextResponse.json(
      { error: "Falta configurar la base de datos (DATABASE_URL)." },
      { status: 503 },
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = (await request.json()) as { name?: string; email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña tiene que tener 8 caracteres o más" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya hay una cuenta con ese email" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash,
    },
  });

  return NextResponse.json({ ok: true });
}
