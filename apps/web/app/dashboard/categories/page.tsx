"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Category = {
  _id: Id<"categories">;
  name: string;
  description?: string;
  displayOrder: number;
  divisionId?: Id<"divisions">;
  divisionName: string;
  scope?: "library" | "discussion";
};

const scopeLabel = (scope: Category["scope"]) => (scope === "discussion" ? "Discussion" : "Library");

export default function CategoriesPage() {
  const categories = useQuery(api.categories.list, {});
  const divisions = useQuery(api.divisions.list);
  const create = useMutation(api.categories.create);
  const update = useMutation(api.categories.update);
  const remove = useMutation(api.categories.remove);

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Category>[] = [
    { key: "name", label: "Name" },
    {
      key: "scope",
      label: "Used In",
      render: (r) => scopeLabel(r.scope),
      filterValue: (r) => scopeLabel(r.scope),
      filterOptions: [
        { label: "Library", value: "Library" },
        { label: "Discussion", value: "Discussion" },
      ],
    },
    {
      key: "divisionName",
      label: "Division",
      filterOptions: (divisions ?? []).map((d) => ({ label: d.name, value: d.name })),
    },
    { key: "description", label: "Description", render: (r) => r.description ?? "—" },
    { key: "displayOrder", label: "Order" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Categories</h2>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        getRowId={(r) => r._id}
        searchPlaceholder="Search categories..."
        addButton={
          <button
            onClick={() => setCreating(true)}
            className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + Add Category
          </button>
        }
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete category "${row.name}"?`)) remove({ id: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />

      {(creating || editing) && (
        <CategoryForm
          initial={editing}
          divisions={divisions ?? []}
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

function CategoryForm({
  initial,
  divisions,
  onClose,
  onSubmit,
}: {
  initial: Category | null;
  divisions: { _id: Id<"divisions">; name: string }[];
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    description?: string;
    displayOrder: number;
    divisionId?: Id<"divisions">;
    scope: "library" | "discussion";
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [divisionId, setDivisionId] = useState(initial?.divisionId ?? "");
  const [scope, setScope] = useState<"library" | "discussion">(initial?.scope ?? "library");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={initial ? "Edit Category" : "Add Category"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({
              name,
              description: description || undefined,
              displayOrder: Number(displayOrder),
              divisionId: divisionId ? (divisionId as Id<"divisions">) : undefined,
              scope,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FormField label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Used In">
          <select value={scope} onChange={(e) => setScope(e.target.value as "library" | "discussion")} className={inputClass}>
            <option value="library">Library</option>
            <option value="discussion">Discussion</option>
          </select>
        </FormField>
        <FormField label="Division">
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className={inputClass}
          >
            <option value="">None</option>
            {divisions.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={3}
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
