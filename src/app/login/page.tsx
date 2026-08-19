import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthForm
      mode="login"
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
      githubEnabled={Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)}
    />
  );
}
