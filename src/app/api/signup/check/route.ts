import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Enter your email." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: pending } = await adminClient
    .from("pending_signups")
    .select("full_name")
    .eq("email", email)
    .maybeSingle();

  if (pending) {
    return NextResponse.json({ fullName: pending.full_name });
  }

  // Not a self-serve pending row — but they may have already been sent an
  // email invite. Either path should work from this one page, so also
  // check for an existing account that hasn't set its password yet.
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, role, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (profile && profile.role !== "admin" && profile.must_change_password) {
    return NextResponse.json({ fullName: profile.full_name });
  }
  if (profile && !profile.must_change_password) {
    return NextResponse.json(
      { error: "This email already has an active account. Sign in instead." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "We don't have an invitation on file for that email. Ask your admin." },
    { status: 404 }
  );
}
