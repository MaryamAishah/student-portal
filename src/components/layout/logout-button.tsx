import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <Button type="submit" variant="ghost" size="sm">
        Log out
      </Button>
    </form>
  );
}
