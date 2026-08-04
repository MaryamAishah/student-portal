"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Status = "checking" | "ready" | "invalid" | "saving" | "done";
type EmailOtpType = "recovery" | "invite" | "signup" | "email_change" | "magiclink" | "email";

function readAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const fromQuery = new URLSearchParams(window.location.search);
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const description = fromQuery.get("error_description") ?? fromHash.get("error_description");
  const code = fromQuery.get("error_code") ?? fromHash.get("error_code");
  const error = fromQuery.get("error") ?? fromHash.get("error");

  if (description || code || error) {
    console.error("[reset-password] auth error in URL:", { error, code, description });
    return description?.replace(/\+/g, " ") ?? code ?? error;
  }
  return null;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const otpType = (searchParams.get("type") as EmailOtpType | null) ?? "recovery";

  const [status, setStatus] = useState<Status>(tokenHash ? "ready" : "checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Legacy fallback: links generated before the email templates were
  // switched to the explicit token_hash flow rely on Supabase's
  // detectSessionInUrl auto-processing instead. Skipped entirely when
  // token_hash is present, since that flow verifies on submit instead.
  useEffect(() => {
    if (tokenHash) return;

    const urlError = readAuthError();
    if (urlError) {
      setLinkError(urlError);
      setStatus("invalid");
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus((prev) => (prev === "checking" ? (session ? "ready" : "invalid") : prev));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === "checking" ? "invalid" : prev));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [tokenHash]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("saving");
    const supabase = createClient();

    // Redeem the single-use token only now, on genuine user submission —
    // never automatically on page load — so an email client or security
    // scanner pre-fetching the link can't burn it before the real click.
    if (tokenHash) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (verifyError) {
        setLinkError(verifyError.message);
        setStatus("invalid");
        return;
      }
    }

    const { error: updateError, data } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }

    if (data.user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", data.user.id);
    }

    setStatus("done");
    window.location.href = "/";
  }

  if (status === "checking") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying link…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link expired or invalid</CardTitle>
          <CardDescription>
            {linkError ?? "This password reset link no longer works. Request a new one to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={status === "saving"} className="mt-2">
            {status === "saving" ? "Saving…" : "Save password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
