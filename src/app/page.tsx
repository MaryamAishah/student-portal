import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { ROLE_HOME } from "@/lib/auth/guards";

export default async function RootPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(ROLE_HOME[profile.role]);
}
