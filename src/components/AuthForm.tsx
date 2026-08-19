"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "./BrandMark";

interface AuthFormProps {
  mode: "login" | "register";
  googleEnabled: boolean;
  githubEnabled?: boolean;
}

export function AuthForm({ mode, googleEnabled, githubEnabled = false }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "No pude crear la cuenta");
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        throw new Error(mode === "login" ? "Email o contraseña incorrectos" : "Cuenta creada, pero no pude entrar");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <Link href="/" className="back-link">
        ← {BRAND.name}
      </Link>
      <BrandMark compact />
      <h1>{mode === "login" ? "Entrar" : "Crear cuenta"}</h1>
      <p className="lede">
        {mode === "login"
          ? "Tus rutinas te siguen en el teléfono y en la web."
          : "Registrate y no las perdés si cambiás de celular."}
      </p>

      {googleEnabled || githubEnabled ? (
        <>
          {googleEnabled ? (
            <button
              type="button"
              className="btn-ghost auth-google"
              onClick={() => void signIn("google", { callbackUrl: "/" })}
            >
              Continuar con Google
            </button>
          ) : null}
          {githubEnabled ? (
            <button
              type="button"
              className="btn-ghost auth-google"
              onClick={() => void signIn("github", { callbackUrl: "/" })}
            >
              Continuar con GitHub
            </button>
          ) : null}
          <p className="auth-or">o con el mail</p>
        </>
      ) : null}

      <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
        {mode === "register" ? (
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Un segundo…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login" ? (
          <>
            ¿No tenés cuenta? <Link href="/register">Registrate</Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta? <Link href="/login">Entrá</Link>
          </>
        )}
      </p>
      <p className="auth-legal">
        Al entrar aceptás cómo tratamos los datos. <Link href="/privacy">Privacidad</Link>
      </p>
    </div>
  );
}
