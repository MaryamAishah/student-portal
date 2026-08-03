import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types/database.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 300;

type ResultRow = {
  email: string;
  fullName: string;
  status: "invited" | "error";
  message?: string;
};

export async function POST(request: Request) {
  const profile = await getSessionProfile();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const role = body.role as UserRole;
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (role !== "teacher" && role !== "student") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to invite." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (max ${MAX_ROWS} per upload).` },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { origin } = new URL(request.url);

  const seen = new Set<string>();
  const results: ResultRow[] = [];

  for (const raw of rows) {
    const fullName = String((raw as { fullName?: unknown })?.fullName ?? "").trim();
    const email = String((raw as { email?: unknown })?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      results.push({ email: email || "(blank)", fullName, status: "error", message: "Invalid email." });
      continue;
    }
    if (!fullName) {
      results.push({ email, fullName, status: "error", message: "Missing name." });
      continue;
    }
    if (seen.has(email)) {
      results.push({ email, fullName, status: "error", message: "Duplicate in this file." });
      continue;
    }
    seen.add(email);

    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      results.push({ email, fullName, status: "error", message: error.message });
    } else {
      results.push({ email, fullName, status: "invited" });
    }
  }

  const invited = results.filter((r) => r.status === "invited").length;

  return NextResponse.json({ results, invited, failed: results.length - invited });
}
