import { DashboardNav } from "@/components/DashboardNav";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/snowflake/queries";
import { goalToNavPersona, type NavPersona } from "@/lib/persona";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sessionPersona = (session?.user as Record<string, unknown>)?.persona as
    | "student"
    | "job_seeker"
    | "unset"
    | undefined;

  // The onboarding goal is the authoritative source for the user's journey, so
  // the nav updates immediately after they change it (no re-login required).
  // Fall back to the session persona, then to "explorer" (show both journeys).
  const userId = session.user?.id;
  const profileRow = userId ? await getUserProfile(userId).catch(() => null) : null;
  const goal = (profileRow?.PROFILE_JSON as Record<string, unknown> | null)?.goal as string | undefined;

  let persona: NavPersona;
  const derived = goalToNavPersona(goal);
  if (derived) {
    persona = derived;
  } else if (sessionPersona === "student" || sessionPersona === "job_seeker") {
    persona = sessionPersona;
  } else {
    persona = "explorer";
  }

  return (
    <div className="flex min-h-screen">
      <DashboardNav persona={persona} />
      <main className="flex-1 bg-background p-6 pt-14 lg:pt-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
