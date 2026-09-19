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

  if (!pending) {
    return NextResponse.json(
      { error: "We don't have an invitation on file for that email. Ask your admin." },
      { status: 404 }
    );
  }

  return NextResponse.json({ fullName: pending.full_name });
}
