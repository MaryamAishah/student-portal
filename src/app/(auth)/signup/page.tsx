import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { ROLE_HOME } from "@/lib/auth/guards";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const profile = await getSessionProfile();
  if (profile) {
    redirect(profile.mustChangePassword ? "/change-password" : ROLE_HOME[profile.role]);
  }

  return <SignupForm />;
}
