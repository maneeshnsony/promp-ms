"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Prompts" },
  { href: "/categories", label: "Categories" },
  { href: "/tags", label: "Tags" },
  { href: "/roles", label: "Roles" },
];

export function TopBar() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-foreground">
          Prompt Hub
        </Link>
        <nav className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm hover:text-foreground hover:underline",
                pathname === link.href ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
