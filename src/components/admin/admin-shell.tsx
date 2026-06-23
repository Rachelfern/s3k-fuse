"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Chats", href: "/admin/chats", icon: MessageSquare },
  { label: "Shipments", href: "/admin/shipments", icon: Truck },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/products": "Products",
  "/admin/chats": "Chats",
  "/admin/shipments": "Shipments",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(`${prefix}/`)) return title;
  }

  return "Admin";
}

interface AdminShellProps {
  children: React.ReactNode;
  email: string;
}

export function AdminShell({ children, email }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--whatsapp-primary)] text-[10px] font-bold text-white">
              S3K
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">S3K Commerce</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Admin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-r-2 border-[var(--whatsapp-primary)] bg-[var(--whatsapp-primary)]/10 text-[var(--whatsapp-accent)]"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 px-4 py-4">
          <p className="truncate text-xs text-gray-400">{email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="ml-56 min-h-screen">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500">
            Admin User · {email}
          </p>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
