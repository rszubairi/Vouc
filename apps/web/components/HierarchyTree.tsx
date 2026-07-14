"use client";

import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

export type HierarchyNode = {
  _id: Id<"profiles">;
  nickName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  sponsorId?: Id<"profiles">;
  sponsorApproved: boolean;
};

export function HierarchyTree({ nodes }: { nodes: HierarchyNode[] }) {
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

  return (
    <ul className="pl-0">
      {roots.map((node) => (
        <TreeNode key={node._id} node={node} childrenBySponsor={childrenBySponsor} depth={0} />
      ))}
    </ul>
  );
}

function fullName(n: HierarchyNode) {
  return [n.firstName, n.middleName, n.lastName].filter(Boolean).join(" ");
}

function TreeNode({
  node,
  childrenBySponsor,
  depth,
}: {
  node: HierarchyNode;
  childrenBySponsor: Map<string, HierarchyNode[]>;
  depth: number;
}) {
  const children = childrenBySponsor.get(node._id) ?? [];
  const [expanded, setExpanded] = useState(depth < 1);

  return (
    <li className="mt-1">
      <div className="flex items-center gap-2 py-1">
        {children.length > 0 ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-[#C9A227] text-xs shrink-0"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <span className="font-semibold text-[#1C1B18]">{node.nickName}</span>
        <span className="text-gray-500 text-sm">{fullName(node)}</span>
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
            <TreeNode key={child._id} node={child} childrenBySponsor={childrenBySponsor} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
