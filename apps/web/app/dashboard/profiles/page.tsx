"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ProfilesPage() {
  const profiles = useQuery(api.profiles.listAll);

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1C1B18] mb-6">Profiles</h2>

      {profiles === undefined ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nickname</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Full Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">City</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Country</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Approved</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Full Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profiles.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#1C1B18]">{p.nickName}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {[p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ")}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.emailAddress}</td>
                  <td className="px-4 py-3 text-gray-500">{p.city}</td>
                  <td className="px-4 py-3 text-gray-500">{p.country}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        p.sponsorApproved
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.sponsorApproved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        p.fullAccess
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.fullAccess ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {profiles.length === 0 && (
            <p className="text-center text-gray-400 py-10">No profiles found.</p>
          )}
        </div>
      )}
    </div>
  );
}
