"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database.types";

const NAV_ITEMS: Record<UserRole, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/courses", label: "Courses" },
    { href: "/admin/users", label: "Users" },
  ],
  teacher: [
    { href: "/teacher", label: "My courses" },
    { href: "/teacher/feedback", label: "Feedback" },
  ],
  student: [
    { href: "/student", label: "Dashboard" },
    { href: "/student/history", label: "History" },
  ],
};

export function RoleNav({ role, className }: { role: UserRole; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS[role].map((item) => {
        const isActive =
          pathname === item.href || (item.href !== `/${role}` && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
