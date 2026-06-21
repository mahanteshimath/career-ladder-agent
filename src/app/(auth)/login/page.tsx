import { LoginForm } from "./login-form";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl);

  if (session) {
    redirect(callbackUrl);
  }

  return <LoginForm />;
}

function getSafeCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl) {
    return "/dashboard";
  }

  try {
    const appUrl = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");
    const parsed = new URL(callbackUrl, appUrl.origin);

    if (parsed.origin !== appUrl.origin) {
      return "/dashboard";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}
