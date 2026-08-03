import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database.types";

export type SessionProfile = {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
    mustChangePassword: profile.must_change_password,
  };
}
