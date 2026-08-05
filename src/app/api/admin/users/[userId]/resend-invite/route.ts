import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const sessionProfile = await getSessionProfile();
  if (!sessionProfile || sessionProfile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, must_change_password")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (profile.role === "admin") {
    return NextResponse.json({ error: "Admin accounts aren't invited this way." }, { status: 400 });
  }
  if (!profile.must_change_password) {
    return NextResponse.json(
      { error: "This account has already been activated — there's no pending invite to resend." },
      { status: 400 }
    );
  }
  if (!profile.email) {
    return NextResponse.json({ error: "This account has no email on file." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { origin } = new URL(request.url);

  // Re-inviting an email that already has a pending (unconfirmed) auth
  // user regenerates that same user's invite token rather than creating
  // a duplicate — the same mechanism Supabase's own dashboard uses for
  // "resend invitation". Nothing gets deleted, so existing enrollments/
  // course assignments tied to this profile id are untouched.
  const { error } = await adminClient.auth.admin.inviteUserByEmail(profile.email, {
    data: { full_name: profile.full_name, role: profile.role },
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
