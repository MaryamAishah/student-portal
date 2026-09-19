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
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role as UserRole;
  const method = body.method === "pending" ? "pending" : "invite";

  if (!fullName || !email || (role !== "teacher" && role !== "student")) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (method === "pending") {
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
    }

    const { error } = await adminClient
      .from("pending_signups")
      .insert({ email, full_name: fullName, role, created_by: profile.id });

    if (error) {
      const message = error.code === "23505" ? "That email is already awaiting signup." : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ pending: true });
  }

  const { origin } = new URL(request.url);

  try {
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      console.error(
        "[invite] Supabase error:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      return NextResponse.json(
        { error: error.message || `Invite failed (status ${error.status ?? "unknown"}).` },
        { status: 400 }
      );
    }

    return NextResponse.json({ invited: true });
  } catch (err) {
    console.error(
      "[invite] Threw:",
      err instanceof Error ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : err
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error sending the invite." },
      { status: 500 }
    );
  }
}
