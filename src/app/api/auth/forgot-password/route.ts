import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return NextResponse.redirect(new URL("/forgot-password?error=missing", request.url), 303);
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/reset-password", request.url).toString(),
  });

  // Always report success, whether or not the email has an account, so
  // this endpoint can't be used to enumerate registered addresses.
  return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url), 303);
}
