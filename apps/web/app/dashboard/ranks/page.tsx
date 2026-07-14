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
};

export default function RanksPage() {
  const ranks = useQuery(api.ranks.list);
  const create = useMutation(api.ranks.create);
  const update = useMutation(api.ranks.update);
  const remove = useMutation(api.ranks.remove);

  const [editing, setEditing] = useState<Rank | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Rank>[] = [
    { key: "name", label: "Name" },
    { key: "abbreviation", label: "Abbreviation" },
    { key: "displayOrder", label: "Order" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Membership Type</h2>
      </div>

      <DataTable
        columns={columns}
        data={ranks}
        getRowId={(r) => r._id}
        searchPlaceholder="Search ranks..."
        addButton={
          <button
            onClick={() => setCreating(true)}
            className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + Add Membership Type
          </button>
        }
        actions={(row) => (
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
        )}
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
