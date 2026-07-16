"use client";

import { useMemo, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

export type HierarchyNode = {
  _id: Id<"profiles">;
  nickName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  sponsorId?: Id<"profiles">;
  sponsorName: string;
  sponsorApproved: boolean;
};

export type SortKey = "nickName" | "name" | "sponsorName" | "sponsorApproved";

function fullName(n: HierarchyNode) {
  return [n.firstName, n.middleName, n.lastName].filter(Boolean).join(" ");
}

function compareBy(sortKey: SortKey) {
  return (a: HierarchyNode, b: HierarchyNode) => {
    switch (sortKey) {
      case "nickName":
        return a.nickName.localeCompare(b.nickName);
      case "name":
        return fullName(a).localeCompare(fullName(b));
      case "sponsorName":
        return a.sponsorName.localeCompare(b.sponsorName);
      case "sponsorApproved":
        return Number(b.sponsorApproved) - Number(a.sponsorApproved);
      default:
        return 0;
    }
  };
}

function isDescendant(
  candidateId: Id<"profiles">,
  ofId: Id<"profiles">,
  childrenBySponsor: Map<string, HierarchyNode[]>
): boolean {
  const children = childrenBySponsor.get(ofId) ?? [];
  for (const child of children) {
    if (child._id === candidateId) return true;
    if (isDescendant(candidateId, child._id, childrenBySponsor)) return true;
  }
  return false;
}

export function HierarchyTree({
  nodes,
  expandedIds,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  sortKey,
  onReparent,
}: {
  nodes: HierarchyNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  sortKey: SortKey;
  onReparent: (childId: Id<"profiles">, newSponsorId: Id<"profiles"> | undefined) => void;
}) {
  const { roots, childrenBySponsor, byId } = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n._id, n]));
    const childrenBySponsor = new Map<string, HierarchyNode[]>();
    const roots: HierarchyNode[] = [];

    for (const node of nodes) {
      const hasValidSponsor = node.sponsorId && byId.has(node.sponsorId);
      if (!hasValidSponsor) {
        roots.push(node);
        continue;
      }
      const key = node.sponsorId as string;
      if (!childrenBySponsor.has(key)) childrenBySponsor.set(key, []);
      childrenBySponsor.get(key)!.push(node);
    }

    const cmp = compareBy(sortKey);
    roots.sort(cmp);
    for (const list of childrenBySponsor.values()) list.sort(cmp);

    return { roots, childrenBySponsor, byId };
  }, [nodes, sortKey]);

  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDrop = (targetId: Id<"profiles">, draggedId: string) => {
    setDragOverId(null);
    if (draggedId === targetId) return;
    if (!byId.has(draggedId as Id<"profiles">)) return;
    if (isDescendant(targetId, draggedId as Id<"profiles">, childrenBySponsor)) return;
    onReparent(draggedId as Id<"profiles">, targetId);
  };

  const handleDropOnRoot = (draggedId: string) => {
    setDragOverId(null);
    if (!byId.has(draggedId as Id<"profiles">)) return;
    onReparent(draggedId as Id<"profiles">, undefined);
  };

  return (
    <ul
      className="pl-0"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOverId("__root__");
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        handleDropOnRoot(draggedId);
      }}
    >
      {roots.map((node) => (
        <TreeNode
          key={node._id}
          node={node}
          childrenBySponsor={childrenBySponsor}
          depth={0}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          dragOverId={dragOverId}
          setDragOverId={setDragOverId}
          onDrop={handleDrop}
        />
      ))}
      {dragOverId === "__root__" && (
        <li className="mt-1 pl-6 text-xs text-[#F2650C]">Drop here to move to top level</li>
      )}
    </ul>
  );
}

function TreeNode({
  node,
  childrenBySponsor,
  depth,
  expandedIds,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  dragOverId,
  setDragOverId,
  onDrop,
}: {
  node: HierarchyNode;
  childrenBySponsor: Map<string, HierarchyNode[]>;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  onDrop: (targetId: Id<"profiles">, draggedId: string) => void;
}) {
  const children = childrenBySponsor.get(node._id) ?? [];
  const expanded = expandedIds.has(node._id);
  const isDragOver = dragOverId === node._id;

  return (
    <li className="mt-1">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node._id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverId(node._id);
        }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = e.dataTransfer.getData("text/plain");
          onDrop(node._id, draggedId);
        }}
        className={`flex items-center gap-2 py-1 rounded cursor-grab active:cursor-grabbing ${
          isDragOver ? "bg-orange-50 ring-1 ring-[#F2650C]" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={selectedIds.has(node._id)}
          onChange={() => onToggleSelect(node._id)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 accent-[#F2650C]"
        />
        {children.length > 0 ? (
          <button
            onClick={() => onToggleExpand(node._id)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-[#F2650C] text-xs shrink-0"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <span className="font-semibold text-black">{node.nickName}</span>
        <span className="text-gray-500 text-sm">{fullName(node)}</span>
        <span className="text-gray-400 text-xs">Sponsor: {node.sponsorName}</span>
        {!node.sponsorApproved && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Pending</span>
        )}
        {children.length > 0 && (
          <span className="text-xs text-gray-400">
            ({children.length} downline)
          </span>
        )}
      </div>
      {expanded && children.length > 0 && (
        <ul className="pl-6 border-l border-gray-200 ml-2.5">
          {children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              childrenBySponsor={childrenBySponsor}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              onDrop={onDrop}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
