"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Rank = {
  _id: Id<"userRanks">;
  name: string;
  abbreviation: string;
  displayOrder: number;
  isDeleted?: boolean;
};

export default function RanksPage() {
  const [showDeleted, setShowDeleted] = useState(false);
  const ranks = useQuery(api.ranks.list, { includeDeleted: showDeleted });
  const create = useMutation(api.ranks.create);
  const update = useMutation(api.ranks.update);
  const remove = useMutation(api.ranks.remove);
  const bulkRemove = useMutation(api.ranks.bulkRemove);
  const bulkRestore = useMutation(api.ranks.bulkRestore);

  const [editing, setEditing] = useState<Rank | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkRestoring, setIsBulkRestoring] = useState(false);

  const visibleRanks = showDeleted ? (ranks ?? []).filter((r) => r.isDeleted) : ranks;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected membership type(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      await bulkRemove({ ids: Array.from(selectedIds) as Id<"userRanks">[] });
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkRestoring(true);
    try {
      await bulkRestore({ ids: Array.from(selectedIds) as Id<"userRanks">[] });
      setSelectedIds(new Set());
    } finally {
      setIsBulkRestoring(false);
    }
  };

  const columns: Column<Rank>[] = [
    { key: "name", label: "Name" },
    { key: "abbreviation", label: "Abbreviation" },
    { key: "displayOrder", label: "Order" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Membership Type</h2>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => {
              setShowDeleted(e.target.checked);
              setSelectedIds(new Set());
            }}
          />
          Show deleted
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
          {showDeleted ? (
            <button
              onClick={handleBulkRestore}
              disabled={isBulkRestoring}
              className="text-sm px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:border-[#F2650C] hover:text-[#F2650C] disabled:opacity-50"
            >
              {isBulkRestoring ? "Restoring..." : `Reactivate Selected (${selectedIds.size})`}
            </button>
          ) : (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isBulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={visibleRanks}
        getRowId={(r) => r._id}
        searchPlaceholder="Search ranks..."
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        addButton={
          !showDeleted && (
            <button
              onClick={() => setCreating(true)}
              className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              + Add Membership Type
            </button>
          )
        }
        actions={(row) =>
          showDeleted ? (
            <div className="flex justify-end">
              <button
                onClick={() => bulkRestore({ ids: [row._id] })}
                className="text-sm text-blue-600 hover:underline"
              >
                Reactivate
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete membership type "${row.name}"?`)) remove({ id: row._id });
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          )
        }
      />

      {(creating || editing) && (
        <RankForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (values) => {
            if (editing) {
              await update({ id: editing._id, ...values });
            } else {
              await create(values);
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function RankForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Rank | null;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    abbreviation: string;
    displayOrder: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [abbreviation, setAbbreviation] = useState(initial?.abbreviation ?? "");
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={initial ? "Edit Membership Type" : "Add Membership Type"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({ name, abbreviation, displayOrder: Number(displayOrder) });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FormField label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Abbreviation">
          <input
            required
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Display Order">
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white font-semibold rounded-lg py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </Modal>
  );
}
