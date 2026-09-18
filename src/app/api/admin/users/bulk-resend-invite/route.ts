import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ROWS = 300;

type ResultRow = {
  id: string;
  email: string;
  fullName: string;
  status: "invited" | "error";
  message?: string;
};

export async function POST(request: Request) {
  const sessionProfile = await getSessionProfile();
  if (!sessionProfile || sessionProfile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const userIds = Array.isArray(body.userIds) ? [...new Set(body.userIds)] : [];

  if (userIds.length === 0) {
    return NextResponse.json({ error: "No accounts selected." }, { status: 400 });
  }
  if (userIds.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many accounts (max ${MAX_ROWS} at once).` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, must_change_password")
    .in("id", userIds as string[]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const adminClient = createAdminClient();
  const { origin } = new URL(request.url);

  const results: ResultRow[] = [];

  for (const id of userIds as string[]) {
    const profile = profileById.get(id);

    if (!profile) {
      results.push({ id, email: "", fullName: "", status: "error", message: "User not found." });
      continue;
    }
    if (profile.role === "admin") {
      results.push({
        id,
        email: profile.email ?? "",
        fullName: profile.full_name,
        status: "error",
        message: "Admin accounts aren't invited this way.",
      });
      continue;
    }
    if (!profile.must_change_password) {
      results.push({
        id,
        email: profile.email ?? "",
        fullName: profile.full_name,
        status: "error",
        message: "Already activated.",
      });
      continue;
    }
    if (!profile.email) {
      results.push({ id, email: "", fullName: profile.full_name, status: "error", message: "No email on file." });
      continue;
    }

    const { error } = await adminClient.auth.admin.inviteUserByEmail(profile.email, {
      data: { full_name: profile.full_name, role: profile.role },
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      results.push({ id, email: profile.email, fullName: profile.full_name, status: "error", message: error.message });
      continue;
    }

    results.push({ id, email: profile.email, fullName: profile.full_name, status: "invited" });
  }

  const invited = results.filter((r) => r.status === "invited").length;
  return NextResponse.json({ results, invited, failed: results.length - invited });
}
