import Link from "next/link";

const cards = [
  { title: "Profiles", desc: "Manage members and sponsor approvals", href: "/dashboard/profiles" },
  { title: "Pending Approvals", desc: "Approve new members waiting for sponsor sign-off", href: "/dashboard/approvals" },
  { title: "Events", desc: "View all events and attendance records", href: "/dashboard/events" },
  { title: "Divisions & Categories", desc: "Organise product divisions and categories", href: "/dashboard/divisions" },
  { title: "User Ranks", desc: "Configure rank names and abbreviations", href: "/dashboard/ranks" },
  { title: "Groups", desc: "Manage custom distribution groups", href: "/dashboard/groups" },
  { title: "Settings", desc: "Configure application-wide settings", href: "/dashboard/settings" },
  { title: "Contact / Feedback", desc: "View user messages and delete requests", href: "/dashboard/contact" },
];

export default function DashboardOverview() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1C1B18] mb-2">Dashboard</h2>
      <p className="text-gray-500 mb-8">Welcome to the Vouch admin portal.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <h3 className="font-semibold text-[#1C1B18] mb-1">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
