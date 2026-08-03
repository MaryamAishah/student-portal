import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          return NextResponse.redirect(new URL("/", origin));
        }
      }

      // Authenticated with Google, but no admin-created account exists for
      // this email — the trigger deliberately skipped creating a profile.
      await supabase.auth.signOut();
    }
  }

  return NextResponse.redirect(new URL("/login?error=no-account", origin));
}
