"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Mic,
  Rocket,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNav = [
  { href: "/", label: "Home", icon: Activity },
  { href: "/voice", label: "Voice", icon: Mic },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const adminNav = [
  { href: "/gre", label: "GRE Team", icon: Headphones },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/pilot", label: "Pilot", icon: Rocket },
];

export function Navbar() {
  const pathname = usePathname();
  const isAdminActive = adminNav.some((item) => pathname === item.href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="hidden font-bold sm:inline-block">
            <span className="gradient-text">CIPACA</span>{" "}
            <span className="text-muted-foreground text-sm font-normal">AI Voice</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {mainNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1",
                  isAdminActive && "bg-primary/10 text-primary"
                )}
              >
                Admin
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {adminNav.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
