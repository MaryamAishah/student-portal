import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { RoleNav } from "@/components/layout/role-nav";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar p-4 text-sidebar-foreground md:flex md:flex-col md:justify-between">
        <div className="flex flex-col gap-6">
          <div className="px-3">
            <p className="font-heading text-lg font-bold text-primary">Student Portal</p>
            <p className="text-xs font-medium capitalize text-muted-foreground">{profile.role}</p>
          </div>
          <RoleNav role={profile.role} />
        </div>
        <div className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
          <p className="truncate px-3 text-xs text-muted-foreground">{profile.fullName}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-sidebar p-4 text-sidebar-foreground md:hidden">
          <div>
            <p className="font-heading text-lg font-bold text-primary">Student Portal</p>
            <p className="text-xs font-medium capitalize text-muted-foreground">{profile.role}</p>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
