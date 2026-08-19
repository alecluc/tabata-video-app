import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthForm
      mode="register"
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
      githubEnabled={Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)}
    />
  );
}
