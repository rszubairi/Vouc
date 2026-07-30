"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Platform = "ios" | "android" | "all";

type Release = {
  _id: Id<"appReleases">;
  version: string;
  major: number;
  minor: number;
  patch: number;
  releaseNotes: string;
  platform: Platform;
  isMinimumRequired: boolean;
  publishedAt: number;
};

export default function ReleasesPage() {
  const releases = useQuery(api.releases.list);
  const create = useMutation(api.releases.create);
  const update = useMutation(api.releases.update);
  const remove = useMutation(api.releases.remove);

  const [editing, setEditing] = useState<Release | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Release>[] = [
    { key: "version", label: "Version" },
    { key: "platform", label: "Platform" },
    {
      key: "isMinimumRequired",
      label: "Minimum Required",
      render: (r) =>
        r.isMinimumRequired ? (
          <span className="text-xs font-semibold text-[#F2650C]">Enforced</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    { key: "releaseNotes", label: "Release Notes" },
    {
      key: "publishedAt",
      label: "Published",
      render: (r) => new Date(r.publishedAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Releases</h2>
      </div>

      <DataTable
        columns={columns}
        data={releases}
        getRowId={(r) => r._id}
        searchPlaceholder="Search releases..."
        addButton={
          <button
            onClick={() => setCreating(true)}
            className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            + Add Release
          </button>
        }
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete release "${row.version}"?`)) remove({ id: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />

      {(creating || editing) && (
        <ReleaseForm
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

function ReleaseForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Release | null;
  onClose: () => void;
  onSubmit: (values: {
    major: number;
    minor: number;
    patch: number;
    releaseNotes: string;
    platform: Platform;
    isMinimumRequired: boolean;
  }) => Promise<void>;
}) {
  const [major, setMajor] = useState(initial?.major ?? 0);
  const [minor, setMinor] = useState(initial?.minor ?? 0);
  const [patch, setPatch] = useState(initial?.patch ?? 0);
  const [releaseNotes, setReleaseNotes] = useState(initial?.releaseNotes ?? "");
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? "all");
  const [isMinimumRequired, setIsMinimumRequired] = useState(initial?.isMinimumRequired ?? false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={initial ? "Edit Release" : "Add Release"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({
              major: Number(major),
              minor: Number(minor),
              patch: Number(patch),
              releaseNotes,
              platform,
              isMinimumRequired,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Major">
            <input
              required
              type="number"
              min={0}
              value={major}
              onChange={(e) => setMajor(Number(e.target.value))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Minor">
            <input
              required
              type="number"
              min={0}
              value={minor}
              onChange={(e) => setMinor(Number(e.target.value))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Bugs Resolved">
            <input
              required
              type="number"
              min={0}
              value={patch}
              onChange={(e) => setPatch(Number(e.target.value))}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label="Platform">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className={inputClass}
          >
            <option value="all">All</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </select>
        </FormField>

        <FormField label="Release Notes">
          <textarea
            required
            rows={4}
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isMinimumRequired}
            onChange={(e) => setIsMinimumRequired(e.target.checked)}
          />
          Enforce as minimum required version (older installs will be prompted to update)
        </label>

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
