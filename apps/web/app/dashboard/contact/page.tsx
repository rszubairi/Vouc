"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";

type ContactMessage = {
  _id: Id<"contactUs">;
  _creationTime: number;
  email: string;
  message: string;
  deleteAccountRequest: boolean;
  userName: string | null;
};

export default function ContactPage() {
  const messages = useQuery(api.contactUs.list);
  const remove = useMutation(api.contactUs.remove);

  const columns: Column<ContactMessage>[] = [
    {
      key: "_creationTime",
      label: "Date",
      render: (r) => new Date(r._creationTime).toLocaleString(),
    },
    { key: "email", label: "Email" },
    { key: "userName", label: "User", render: (r) => r.userName ?? "—" },
    { key: "message", label: "Message", render: (r) => <span className="line-clamp-2">{r.message}</span> },
    {
      key: "deleteAccountRequest",
      label: "Type",
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
            r.deleteAccountRequest ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {r.deleteAccountRequest ? "Delete Request" : "General"}
        </span>
      ),
      filterOptions: [
        { label: "General", value: "General" },
        { label: "Delete Request", value: "Delete Request" },
      ],
      filterValue: (r) => (r.deleteAccountRequest ? "Delete Request" : "General"),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Contact Us</h2>
      </div>

      <DataTable
        columns={columns}
        data={messages}
        getRowId={(r) => r._id}
        searchPlaceholder="Search messages..."
        emptyMessage="No contact messages."
        actions={(row) => (
          <button
            onClick={() => {
              if (confirm("Delete this message?")) remove({ id: row._id });
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Delete
          </button>
        )}
      />
    </div>
  );
}
