"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faUsers,
  faUserCheck,
  faCalendarDays,
  faLayerGroup,
  faTags,
  faRankingStar,
  faPeopleGroup,
  faGear,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../../../convex/_generated/api";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: faGaugeHigh },
  { href: "/dashboard/profiles", label: "Profiles", icon: faUsers },
  { href: "/dashboard/approvals", label: "Pending Approvals", icon: faUserCheck },
  { href: "/dashboard/events", label: "Events", icon: faCalendarDays },
  { href: "/dashboard/divisions", label: "Divisions", icon: faLayerGroup },
  { href: "/dashboard/categories", label: "Categories", icon: faTags },
  { href: "/dashboard/ranks", label: "User Ranks", icon: faRankingStar },
  { href: "/dashboard/groups", label: "Groups", icon: faPeopleGroup },
  { href: "/dashboard/settings", label: "Settings", icon: faGear },
  { href: "/dashboard/contact", label: "Contact Us", icon: faEnvelope },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = useQuery(api.profiles.me);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1C1B18] text-[#F5EFE0] flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-[#C9A227]/20">
          <h1 className="text-xl font-bold tracking-tight text-[#C9A227]">Vouch</h1>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#C9A227]/20">
          {me?.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.profileImageUrl}
              alt={me.nickName}
              className="w-10 h-10 rounded-full object-cover border border-[#C9A227]/40"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] font-semibold">
              {me?.nickName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-sm font-medium truncate">{me?.nickName ?? "Loading..."}</span>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-6 py-2.5 text-sm text-[#F5EFE0]/80 hover:bg-[#C9A227]/10 hover:text-[#C9A227] transition-colors"
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-[#C9A227]/20">
          <span className="text-xs text-[#F5EFE0]/40">v1.0.0</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
