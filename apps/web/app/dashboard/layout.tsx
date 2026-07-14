"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faUsers,
  faUserCheck,
  faLayerGroup,
  faTags,
  faRankingStar,
  faGear,
  faEnvelope,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../../../../convex/_generated/api";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: faGaugeHigh },
  { href: "/dashboard/profiles", label: "Profiles", icon: faUsers },
  { href: "/dashboard/approvals", label: "Pending Approvals", icon: faUserCheck },
  { href: "/dashboard/divisions", label: "Divisions", icon: faLayerGroup },
  { href: "/dashboard/categories", label: "Categories", icon: faTags },
  { href: "/dashboard/ranks", label: "Membership Type", icon: faRankingStar },
  { href: "/dashboard/settings", label: "Settings", icon: faGear },
  { href: "/dashboard/contact", label: "Contact Us", icon: faEnvelope },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const me = useQuery(api.admin.currentAdmin);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5EFE0] text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5EFE0] gap-4">
        <p className="text-gray-600">You need admin access to view this page.</p>
        <Link
          href="/login"
          className="text-[#F2650C] font-semibold hover:underline"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 h-full bg-[#F5EFE0] text-black flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-black/10">
          <h1 className="text-xl font-bold tracking-tight text-black">Vouch</h1>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-b border-black/10">
          <div className="w-10 h-10 rounded-full bg-black/10 border border-black/20 flex items-center justify-center text-black font-semibold">
            {me?.nickName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-sm font-medium truncate text-black">{me?.nickName ?? "Admin"}</span>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-black text-[#F5EFE0]"
                    : "text-black/70 hover:bg-black/10 hover:text-black"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-black/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-black/60 hover:text-black transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
