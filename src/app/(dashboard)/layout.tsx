import { DashboardNav } from "@/components/DashboardNav";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const persona = ((session?.user as Record<string, unknown>)?.persona as "student" | "job_seeker") || "job_seeker";

  return (
    <div className="flex min-h-screen">
      <DashboardNav persona={persona} />
      <main className="flex-1 bg-background p-6 pt-14 lg:pt-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
