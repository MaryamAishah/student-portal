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
  teacher: [{ href: "/teacher", label: "My courses" }],
  student: [
    { href: "/student", label: "Dashboard" },
    { href: "/student/history", label: "History" },
  ],
};

export function RoleNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS[role].map((item) => {
        const isActive =
          pathname === item.href || (item.href !== `/${role}` && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
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
