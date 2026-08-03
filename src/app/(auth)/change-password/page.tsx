import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSessionProfile } from "@/lib/auth/get-session";
import { ROLE_HOME } from "@/lib/auth/guards";

const ERROR_MESSAGES: Record<string, string> = {
  weak: "Password must be at least 8 characters.",
  mismatch: "Passwords do not match.",
  failed: "Something went wrong updating your password. Try again.",
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] : null;

  const profile = await getSessionProfile();
  if (!profile) {
    redirect("/login");
  }
  if (!profile.mustChangePassword) {
    redirect(ROLE_HOME[profile.role]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          This is your first login. Choose a new password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/api/auth/change-password" method="POST" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Button type="submit" className="mt-2">
            Save password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
