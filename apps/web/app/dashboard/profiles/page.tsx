"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";

type Profile = {
  _id: Id<"profiles">;
  nickName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  emailAddress: string;
  city: string;
  country: string;
  sponsorApproved: boolean;
  fullAccess: boolean;
};

export default function ProfilesPage() {
  const profiles = useQuery(api.profiles.listAll);
  const setFullAccess = useMutation(api.profiles.adminSetFullAccess);
  const deleteProfile = useMutation(api.profiles.adminDeleteProfile);

  const columns: Column<Profile>[] = [
    { key: "nickName", label: "Nickname" },
    {
      key: "fullName",
      label: "Full Name",
      searchValue: (p) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
      render: (p) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
    },
    { key: "emailAddress", label: "Email" },
    { key: "city", label: "City" },
    {
      key: "country",
      label: "Country",
      filterOptions: Array.from(new Set((profiles ?? []).map((p) => p.country))).map((c) => ({
        label: c,
        value: c,
      })),
    },
    {
      key: "sponsorApproved",
      label: "Approved",
      render: (p) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
            p.sponsorApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {p.sponsorApproved ? "Approved" : "Pending"}
        </span>
      ),
      filterOptions: [
        { label: "Approved", value: "Approved" },
        { label: "Pending", value: "Pending" },
      ],
      filterValue: (p) => (p.sponsorApproved ? "Approved" : "Pending"),
    },
    {
      key: "fullAccess",
      label: "Full Access",
      render: (p) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
            p.fullAccess ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {p.fullAccess ? "Yes" : "No"}
        </span>
      ),
      filterOptions: [
        { label: "Yes", value: "Yes" },
        { label: "No", value: "No" },
      ],
      filterValue: (p) => (p.fullAccess ? "Yes" : "No"),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1C1B18]">Profiles</h2>
      </div>

      <DataTable
        columns={columns}
        data={profiles}
        getRowId={(p) => p._id}
        searchPlaceholder="Search profiles..."
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setFullAccess({ profileId: row._id, fullAccess: !row.fullAccess })}
              className="text-sm text-blue-600 hover:underline"
            >
              {row.fullAccess ? "Revoke Access" : "Grant Access"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete profile "${row.nickName}"?`)) deleteProfile({ profileId: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      />
    </div>
  );
}
