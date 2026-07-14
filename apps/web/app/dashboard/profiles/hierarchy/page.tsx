"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { HierarchyTree } from "../../../../components/HierarchyTree";

export default function HierarchyPage() {
  const nodes = useQuery(api.profiles.adminHierarchyTree);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1C1B18]">Sponsor Hierarchy</h2>
        <Link href="/dashboard/profiles" className="text-sm text-[#C9A227] font-semibold hover:underline">
          Back to Profiles
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {nodes === undefined ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : nodes.length === 0 ? (
          <p className="text-gray-400 text-sm">No profiles found.</p>
        ) : (
          <HierarchyTree nodes={nodes} />
        )}
      </div>
    </div>
  );
}
