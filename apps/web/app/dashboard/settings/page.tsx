"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Setting = {
  _id: Id<"settings">;
  settingName: string;
  settingValue: string;
  displayOrder: number;
};

export default function SettingsPage() {
  const settings = useQuery(api.settings.list);
  const create = useMutation(api.settings.create);
  const update = useMutation(api.settings.update);
  const remove = useMutation(api.settings.remove);

  const [editing, setEditing] = useState<Setting | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Setting>[] = [
    { key: "settingName", label: "Setting" },
    { key: "settingValue", label: "Value" },
    { key: "displayOrder", label: "Order" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Settings</h2>
      </div>

      <DataTable
        columns={columns}
        data={settings}
        getRowId={(r) => r._id}
        searchPlaceholder="Search settings..."
        addButton={
          <button
            onClick={() => setCreating(true)}
            className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + Add Setting
          </button>
        }
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete setting "${row.settingName}"?`)) remove({ id: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />

      {(creating || editing) && (
        <SettingForm
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

function SettingForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Setting | null;
  onClose: () => void;
  onSubmit: (values: {
    settingName: string;
    settingValue: string;
    displayOrder: number;
  }) => Promise<void>;
}) {
  const [settingName, setSettingName] = useState(initial?.settingName ?? "");
  const [settingValue, setSettingValue] = useState(initial?.settingValue ?? "");
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={initial ? "Edit Setting" : "Add Setting"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({ settingName, settingValue, displayOrder: Number(displayOrder) });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FormField label="Setting Name">
          <input
            required
            value={settingName}
            onChange={(e) => setSettingName(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Value">
          <input
            required
            value={settingValue}
            onChange={(e) => setSettingValue(e.target.value)}
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
