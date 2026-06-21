import { LoginForm } from "./login-form";
import { auth } from "@/lib/auth/config";
import { getSafeCallbackUrl } from "@/lib/auth/callback-url";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(
    params?.callbackUrl,
    process.env.NEXTAUTH_URL || "http://localhost:3000"
  );

  if (session) {
    redirect(callbackUrl);
  }

  return <LoginForm />;
}
