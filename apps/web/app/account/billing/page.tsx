"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { DataTable, type Column } from "../../../components/DataTable";
import { Doc } from "../../../../../convex/_generated/dataModel";

function formatDate(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );
}

const statusLabels: Record<string, string> = {
  active: "Active",
  trialing: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  paused: "Paused",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
};

const paymentColumns: Column<Doc<"payments">>[] = [
  {
    key: "paidAt",
    label: "Date",
    render: (row) => formatDate(row.paidAt),
    sortValue: (row) => row.paidAt,
  },
  {
    key: "amount",
    label: "Amount",
    render: (row) => formatAmount(row.amount, row.currency),
    sortValue: (row) => row.amount,
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <span
        className={
          row.status === "paid"
            ? "text-green-700"
            : row.status === "failed"
            ? "text-red-600"
            : "text-gray-600"
        }
      >
        {row.status === "paid" ? "Paid" : row.status === "failed" ? "Failed" : "Refunded"}
      </span>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (row) => row.description ?? "Annual membership",
  },
];

export default function BillingPage() {
  const subscriptionData = useQuery(api.payments.mySubscription);
  const paymentHistory = useQuery(api.payments.myPaymentHistory);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createBillingPortalSession = useAction(api.stripe.createBillingPortalSession);

  const [redirecting, setRedirecting] = useState(false);

  async function handleSubscribe() {
    setRedirecting(true);
    try {
      const { url } = await createCheckoutSession({
        successUrl: `${window.location.origin}/account/billing?checkout=success`,
        cancelUrl: `${window.location.origin}/account/billing?checkout=cancelled`,
      });
      window.location.href = url;
    } catch {
      setRedirecting(false);
    }
  }

  async function handleManage() {
    setRedirecting(true);
    try {
      const { url } = await createBillingPortalSession({
        returnUrl: `${window.location.origin}/account/billing`,
      });
      window.location.href = url;
    } catch {
      setRedirecting(false);
    }
  }

  const subscription = subscriptionData?.subscription ?? null;
  const isActive = subscriptionData?.fullAccess ?? false;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-black mb-6">Billing</h1>

      <div className="bg-[#F5EFE0] border border-black/10 rounded-xl p-6">
        <h2 className="text-sm font-bold text-black mb-3">Membership Status</h2>

        {subscriptionData === undefined ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-1">
              Status:{" "}
              <span className="font-semibold text-black">
                {subscription ? statusLabels[subscription.status] ?? subscription.status : "No active subscription"}
              </span>
            </p>
            {isActive && (
              <p className="text-sm text-gray-700 mb-4">
                {subscription?.cancelAtPeriodEnd ? "Access ends" : "Renews"} on{" "}
                <span className="font-semibold text-black">
                  {formatDate(subscriptionData?.fullAccessExpiryDate)}
                </span>
              </p>
            )}

            <div className="flex gap-3 mt-4">
              {!isActive && (
                <button onClick={handleSubscribe} disabled={redirecting} className={buttonClass}>
                  {redirecting ? "Redirecting..." : "Subscribe — Annual Membership"}
                </button>
              )}
              {subscription && (
                <button onClick={handleManage} disabled={redirecting} className={secondaryButtonClass}>
                  {redirecting ? "Redirecting..." : "Manage Subscription"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-bold text-black mb-3">Payment History</h2>
        <DataTable
          columns={paymentColumns}
          data={paymentHistory}
          getRowId={(row) => row._id}
          emptyMessage="No payments yet."
          searchPlaceholder="Search payments..."
        />
      </div>
    </div>
  );
}

const buttonClass =
  "bg-black text-white font-semibold rounded-lg py-2.5 px-6 hover:bg-neutral-800 transition-colors disabled:opacity-50";

const secondaryButtonClass =
  "bg-white border border-black text-black font-semibold rounded-lg py-2.5 px-6 hover:bg-black/5 transition-colors disabled:opacity-50";
