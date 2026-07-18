"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { HierarchyTree, SortKey } from "../../../../components/HierarchyTree";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nickName", label: "Nickname" },
  { value: "name", label: "Name" },
  { value: "sponsorName", label: "Sponsor" },
  { value: "sponsorApproved", label: "Status" },
];

export default function HierarchyPage() {
  const nodes = useQuery(api.profiles.adminHierarchyTree);
  const setSponsor = useMutation(api.profiles.adminSetSponsor);
  const bulkDelete = useMutation(api.profiles.adminBulkDeleteProfiles);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("nickName");
  const [isDeleting, setIsDeleting] = useState(false);

  const allIds = useMemo(() => nodes?.map((n) => n._id as string) ?? [], [nodes]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReparent = async (
    childId: Id<"profiles">,
    newSponsorId: Id<"profiles"> | undefined
  ) => {
    try {
      await setSponsor({ profileId: childId, sponsorId: newSponsorId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move profile.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const selectedNames = (nodes ?? [])
      .filter((n) => selectedIds.has(n._id))
      .map((n) => n.nickName);
    if (
      !confirm(
        `Delete ${selectedIds.size} selected profile${selectedIds.size === 1 ? "" : "s"}?\n\n${selectedNames.join("\n")}\n\nThis cannot be undone.`
      )
    )
      return;
    setIsDeleting(true);
    try {
      await bulkDelete({ profileIds: Array.from(selectedIds) as Id<"profiles">[] });
      setSelectedIds(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete selected profiles.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Sponsor Hierarchy</h2>
        <Link href="/dashboard/profiles" className="text-sm text-[#F2650C] font-semibold hover:underline">
          Back to Profiles
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setExpandedIds(new Set(allIds))}
          className="text-sm px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:border-[#F2650C] hover:text-[#F2650C]"
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedIds(new Set())}
          className="text-sm px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:border-[#F2650C] hover:text-[#F2650C]"
        >
          Collapse All
        </button>

        <div className="flex items-center gap-2 ml-2">
          <label className="text-sm text-gray-500">Sort by</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded px-2 py-1.5"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Drag a profile onto another to change its sponsor. Drop at the top of the list to make it a
        root profile.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {nodes === undefined ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : nodes.length === 0 ? (
          <p className="text-gray-400 text-sm">No profiles found.</p>
        ) : (
          <HierarchyTree
            nodes={nodes}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            sortKey={sortKey}
            onReparent={handleReparent}
          />
        )}
      </div>
    </div>
  );
}
