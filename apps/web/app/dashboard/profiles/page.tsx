"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DataTable, Column } from "../../../components/DataTable";
import { Modal, FormField, inputClass } from "../../../components/Modal";

type Profile = {
  _id: Id<"profiles">;
  nickName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  emailAddress: string;
  sponsorEmailAddress: string;
  sponsorId?: Id<"profiles">;
  sponsorName: string;
  userRankId?: Id<"userRanks">;
  membershipTypeName: string;
  phoneNumber?: string;
  birthDate?: number;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  zipCode?: string;
  country: string;
  bio?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  line?: string;
  tiktok?: string;
  discord?: string;
  weChat?: string;
  sponsorApproved: boolean;
  fullAccess: boolean;
  isAdmin?: boolean;
};

export default function ProfilesPage() {
  const profiles = useQuery(api.profiles.listAll);
  const ranks = useQuery(api.profiles.listRanks);
  const setFullAccess = useMutation(api.profiles.adminSetFullAccess);
  const deleteProfile = useMutation(api.profiles.adminDeleteProfile);
  const updateProfile = useMutation(api.profiles.adminUpdateProfile);

  const [editing, setEditing] = useState<Profile | null>(null);

  const columns: Column<Profile>[] = [
    { key: "nickName", label: "Nickname", defaultWidth: 130 },
    { key: "firstName", label: "First Name", defaultWidth: 130 },
    { key: "middleName", label: "Middle Name", defaultWidth: 130 },
    { key: "lastName", label: "Last Name", defaultWidth: 130 },
    { key: "emailAddress", label: "Email", defaultWidth: 200 },
    { key: "sponsorName", label: "Sponsor", defaultWidth: 150 },
    { key: "membershipTypeName", label: "Membership Type", defaultWidth: 160 },
    { key: "city", label: "City", defaultWidth: 130 },
    {
      key: "country",
      label: "Country",
      defaultWidth: 130,
      filterOptions: Array.from(new Set((profiles ?? []).map((p) => p.country))).map((c) => ({
        label: c,
        value: c,
      })),
    },
    {
      key: "sponsorApproved",
      label: "Approved",
      defaultWidth: 120,
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
      defaultWidth: 120,
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
        <h2 className="text-2xl font-bold text-black">Profiles</h2>
        <Link
          href="/dashboard/profiles/hierarchy"
          className="text-sm text-[#F2650C] font-semibold hover:underline"
        >
          View Hierarchy
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={profiles}
        getRowId={(p) => p._id}
        searchPlaceholder="Search profiles..."
        storageKey="profiles-table"
        actions={(row) => (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(row)} className="text-sm text-blue-600 hover:underline">
              Edit
            </button>
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

      {editing && (
        <ProfileForm
          initial={editing}
          ranks={ranks ?? []}
          profiles={profiles ?? []}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            await updateProfile({ profileId: editing._id, ...values });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

type RankOption = { _id: Id<"userRanks">; name: string };

function ProfileForm({
  initial,
  ranks,
  profiles,
  onClose,
  onSubmit,
}: {
  initial: Profile;
  ranks: RankOption[];
  profiles: Profile[];
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nickName: initial.nickName,
    firstName: initial.firstName,
    middleName: initial.middleName ?? "",
    lastName: initial.lastName,
    emailAddress: initial.emailAddress,
    sponsorEmailAddress: initial.sponsorEmailAddress,
    sponsorId: initial.sponsorId ?? "",
    userRankId: initial.userRankId ?? "",
    phoneNumber: initial.phoneNumber ?? "",
    addressLine1: initial.addressLine1 ?? "",
    addressLine2: initial.addressLine2 ?? "",
    city: initial.city,
    zipCode: initial.zipCode ?? "",
    country: initial.country,
    bio: initial.bio ?? "",
    website: initial.website ?? "",
    facebook: initial.facebook ?? "",
    instagram: initial.instagram ?? "",
    twitter: initial.twitter ?? "",
    line: initial.line ?? "",
    tiktok: initial.tiktok ?? "",
    discord: initial.discord ?? "",
    weChat: initial.weChat ?? "",
    sponsorApproved: initial.sponsorApproved,
    fullAccess: initial.fullAccess,
    isAdmin: initial.isAdmin ?? false,
  });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal title={`Edit Profile — ${initial.nickName}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit({
              ...form,
              middleName: form.middleName || undefined,
              sponsorId: form.sponsorId || undefined,
              userRankId: form.userRankId || undefined,
              phoneNumber: form.phoneNumber || undefined,
              addressLine1: form.addressLine1 || undefined,
              addressLine2: form.addressLine2 || undefined,
              zipCode: form.zipCode || undefined,
              bio: form.bio || undefined,
              website: form.website || undefined,
              facebook: form.facebook || undefined,
              instagram: form.instagram || undefined,
              twitter: form.twitter || undefined,
              line: form.line || undefined,
              tiktok: form.tiktok || undefined,
              discord: form.discord || undefined,
              weChat: form.weChat || undefined,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="Nickname">
            <input required value={form.nickName} onChange={(e) => set("nickName", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Email">
            <input required value={form.emailAddress} onChange={(e) => set("emailAddress", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="First Name">
            <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Middle Name">
            <input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Last Name">
            <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Sponsor Email">
            <input value={form.sponsorEmailAddress} onChange={(e) => set("sponsorEmailAddress", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Sponsor">
            <select value={form.sponsorId} onChange={(e) => set("sponsorId", e.target.value as Id<"profiles"> | "")} className={inputClass}>
              <option value="">— None —</option>
              {profiles
                .filter((p) => p._id !== initial._id)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nickName}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Membership Type">
            <select value={form.userRankId} onChange={(e) => set("userRankId", e.target.value as Id<"userRanks"> | "")} className={inputClass}>
              <option value="">— None —</option>
              {ranks.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Phone">
            <input value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="City">
            <input required value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Country">
            <input required value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Zip Code">
            <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Address Line 1">
            <input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Address Line 2">
            <input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Website">
            <input value={form.website} onChange={(e) => set("website", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Facebook">
            <input value={form.facebook} onChange={(e) => set("facebook", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Instagram">
            <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Twitter">
            <input value={form.twitter} onChange={(e) => set("twitter", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Line">
            <input value={form.line} onChange={(e) => set("line", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="TikTok">
            <input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Discord">
            <input value={form.discord} onChange={(e) => set("discord", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="WeChat">
            <input value={form.weChat} onChange={(e) => set("weChat", e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Bio">
          <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} className={inputClass} rows={3} />
        </FormField>

        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.sponsorApproved} onChange={(e) => set("sponsorApproved", e.target.checked)} />
            Sponsor Approved
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.fullAccess} onChange={(e) => set("fullAccess", e.target.checked)} />
            Full Access
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isAdmin} onChange={(e) => set("isAdmin", e.target.checked)} />
            Admin
          </label>
        </div>

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
