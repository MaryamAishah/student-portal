import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return NextResponse.redirect(new URL("/change-password?error=weak", request.url), 303);
  }
  if (password !== confirmPassword) {
    return NextResponse.redirect(new URL("/change-password?error=mismatch", request.url), 303);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const { error: updateAuthError } = await supabase.auth.updateUser({ password });
  if (updateAuthError) {
    return NextResponse.redirect(new URL("/change-password?error=failed", request.url), 303);
  }

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (updateProfileError) {
    return NextResponse.redirect(new URL("/change-password?error=failed", request.url), 303);
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
