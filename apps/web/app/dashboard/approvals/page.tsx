"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";

type PendingProfile = {
  _id: Id<"profiles">;
  nickName: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  sponsorName: string;
  city: string;
  country: string;
};

export default function ApprovalsPage() {
  const pending = useQuery(api.profiles.adminPendingApprovals);
  const approve = useMutation(api.profiles.adminApprove);
  const reject = useMutation(api.profiles.adminReject);

  const columns: Column<PendingProfile>[] = [
    { key: "nickName", label: "Nickname" },
    {
      key: "fullName",
      label: "Full Name",
      searchValue: (r) => `${r.firstName} ${r.lastName}`,
      render: (r) => `${r.firstName} ${r.lastName}`,
    },
    { key: "emailAddress", label: "Email" },
    { key: "sponsorName", label: "Sponsor" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Pending Approvals</h2>
      </div>

      <DataTable
        columns={columns}
        data={pending}
        getRowId={(r) => r._id}
        searchPlaceholder="Search pending members..."
        emptyMessage="No pending approvals."
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => approve({ profileId: row._id })}
              className="text-sm text-green-600 hover:underline"
            >
              Approve
            </button>
            <button
              onClick={() => {
                if (confirm(`Reject ${row.nickName}'s request?`)) reject({ profileId: row._id });
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Reject
            </button>
          </div>
        )}
      />
    </div>
  );
}
