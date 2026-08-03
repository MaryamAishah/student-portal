import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types/database.types";

export async function POST(request: Request) {
  const profile = await getSessionProfile();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const role = body.role as UserRole;

  if (!fullName || !email || (role !== "teacher" && role !== "student")) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { origin } = new URL(request.url);

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invited: true });
}
