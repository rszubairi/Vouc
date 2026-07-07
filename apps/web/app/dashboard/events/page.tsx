"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type EventRow = {
  _id: Id<"events">;
  title: string;
  eventType: string;
  details: string;
  speaker?: string;
  eventDateStart: number;
  eventDateEnd: number;
  isDeleted: boolean;
  creatorName: string;
};

function toLocalInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EventsPage() {
  const events = useQuery(api.events.adminList);
  const update = useMutation(api.events.adminUpdate);
  const remove = useMutation(api.events.adminDelete);

  const [editing, setEditing] = useState<EventRow | null>(null);

  const columns: Column<EventRow>[] = [
    { key: "title", label: "Title" },
    {
      key: "eventType",
      label: "Type",
      filterOptions: Array.from(new Set((events ?? []).map((e) => e.eventType))).map(
        (t) => ({ label: t, value: t })
      ),
    },
    { key: "creatorName", label: "Creator" },
    {
      key: "eventDateStart",
      label: "Starts",
      render: (r) => new Date(r.eventDateStart).toLocaleString(),
    },
    {
      key: "isDeleted",
      label: "Status",
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
            r.isDeleted ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {r.isDeleted ? "Deleted" : "Active"}
        </span>
      ),
      filterOptions: [
        { label: "Active", value: "Active" },
        { label: "Deleted", value: "Deleted" },
      ],
      filterValue: (r) => (r.isDeleted ? "Deleted" : "Active"),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1C1B18]">Events</h2>
      </div>

      <DataTable
        columns={columns}
        data={events}
        getRowId={(r) => r._id}
        searchPlaceholder="Search events..."
        emptyMessage="No events found."
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Permanently delete "${row.title}"?`)) remove({ id: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />

      {editing && (
        <EventForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            await update({ id: editing._id, ...values });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EventForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial: EventRow;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    eventType: string;
    details: string;
    speaker?: string;
    eventDateStart: number;
    eventDateEnd: number;
    isDeleted: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [eventType, setEventType] = useState(initial.eventType);
  const [details, setDetails] = useState(initial.details);
  const [speaker, setSpeaker] = useState(initial.speaker ?? "");
  const [start, setStart] = useState(toLocalInput(initial.eventDateStart));
  const [end, setEnd] = useState(toLocalInput(initial.eventDateEnd));
  const [isDeleted, setIsDeleted] = useState(initial.isDeleted);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title="Edit Event" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({
              title,
              eventType,
              details,
              speaker: speaker || undefined,
              eventDateStart: new Date(start).getTime(),
              eventDateEnd: new Date(end).getTime(),
              isDeleted,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FormField label="Title">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Type">
          <input
            required
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Speaker">
          <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Details">
          <textarea
            required
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </FormField>
        <FormField label="Starts">
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Ends">
          <input
            type="datetime-local"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <label className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isDeleted}
            onChange={(e) => setIsDeleted(e.target.checked)}
          />
          Mark as deleted
        </label>
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
