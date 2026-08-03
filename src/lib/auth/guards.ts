import { redirect } from "next/navigation";
import { getSessionProfile, type SessionProfile } from "@/lib/auth/get-session";
import type { UserRole } from "@/lib/types/database.types";

export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.mustChangePassword) {
    redirect("/change-password");
  }

  if (profile.role !== role) {
    redirect(ROLE_HOME[profile.role]);
  }

  return profile;
}
