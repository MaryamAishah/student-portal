import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: pending } = await adminClient
    .from("pending_signups")
    .select("id, email, full_name, role, course_id, group_id")
    .eq("email", email)
    .maybeSingle();

  if (!pending) {
    return NextResponse.json(
      { error: "We don't have an invitation on file for that email. Ask your admin." },
      { status: 404 }
    );
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: pending.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: pending.full_name, role: pending.role },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Couldn't create your account." },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  // They just chose this password themselves — no need to force a change.
  await adminClient.from("profiles").update({ must_change_password: false }).eq("id", userId);

  let warning: string | null = null;
  if (pending.role === "student" && pending.course_id && pending.group_id) {
    const { error: enrollError } = await adminClient
      .from("enrollments")
      .insert({ course_id: pending.course_id, group_id: pending.group_id, student_id: userId });

    if (enrollError) {
      warning = `Your account was created, but we couldn't enroll you in your course: ${enrollError.message}. Ask your admin to add you manually.`;
    }
  }

  await adminClient.from("pending_signups").delete().eq("id", pending.id);

  return NextResponse.json({ ok: true, warning });
}
