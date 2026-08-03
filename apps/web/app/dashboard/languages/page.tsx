"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Language = {
  _id: Id<"languages">;
  name: string;
  displayOrder: number;
};

export default function LanguagesPage() {
  const languages = useQuery(api.languages.list);
  const create = useMutation(api.languages.create);
  const update = useMutation(api.languages.update);
  const remove = useMutation(api.languages.remove);
  const bulkRemove = useMutation(api.languages.bulkRemove);
  const seed = useMutation(api.languages.seed);

  const [editing, setEditing] = useState<Language | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
    if (!confirm(`Delete ${selectedIds.size} selected language(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      await bulkRemove({ ids: Array.from(selectedIds) as Id<"languages">[] });
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns: Column<Language>[] = [
    { key: "name", label: "Name" },
    { key: "displayOrder", label: "Order" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Languages</h2>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isBulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={languages}
        getRowId={(r) => r._id}
        searchPlaceholder="Search languages..."
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        addButton={
          <div className="flex gap-3">
            {languages?.length === 0 && (
              <button
                onClick={() => seed({})}
                className="bg-white border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Seed defaults
              </button>
            )}
            <button
              onClick={() => setCreating(true)}
              className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              + Add Language
            </button>
          </div>
        }
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete language "${row.name}"?`)) remove({ id: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />

      {(creating || editing) && (
        <LanguageForm
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

function LanguageForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Language | null;
  onClose: () => void;
  onSubmit: (values: { name: string; displayOrder: number }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={initial ? "Edit Language" : "Add Language"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({ name, displayOrder: Number(displayOrder) });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FormField label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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
