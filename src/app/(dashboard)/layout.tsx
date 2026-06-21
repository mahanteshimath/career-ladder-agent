import { DashboardNav } from "@/components/DashboardNav";
import { auth } from "@/lib/auth/config";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const persona = ((session?.user as Record<string, unknown>)?.persona as "student" | "job_seeker") || "job_seeker";

  return (
    <div className="flex min-h-screen">
      <DashboardNav persona={persona} />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
