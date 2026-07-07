"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Group = {
  _id: Id<"groups">;
  name: string;
  ownerName: string;
  memberCount: number;
};

export default function GroupsPage() {
  const groups = useQuery(api.groups.list);
  const create = useMutation(api.groups.create);
  const update = useMutation(api.groups.update);
  const remove = useMutation(api.groups.remove);

  const [editing, setEditing] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Group>[] = [
    { key: "name", label: "Name" },
    { key: "ownerName", label: "Owner" },
    { key: "memberCount", label: "Members" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1C1B18]">Groups</h2>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        getRowId={(r) => r._id}
        searchPlaceholder="Search groups..."
        addButton={
          <button
            onClick={() => setCreating(true)}
            className="bg-[#C9A227] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#B8911E] transition-colors"
          >
            + Add Group
          </button>
        }
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete group "${row.name}"?`)) remove({ id: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />

      {(creating || editing) && (
        <GroupForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (name) => {
            if (editing) {
              await update({ id: editing._id, name });
            } else {
              await create({ name });
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function GroupForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Group | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={initial ? "Edit Group" : "Add Group"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit(name);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FormField label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </FormField>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#C9A227] text-white font-semibold rounded-lg py-2.5 hover:bg-[#B8911E] transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </Modal>
  );
}
